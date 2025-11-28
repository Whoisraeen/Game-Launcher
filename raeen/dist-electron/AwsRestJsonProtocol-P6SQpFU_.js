"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const main = require("./main-grVgP1W2.js");
function jsonReviver(key, value, context) {
  if (context == null ? void 0 : context.source) {
    const numericString = context.source;
    if (typeof value === "number") {
      if (value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER || numericString !== String(value)) {
        const isFractional = numericString.includes(".");
        if (isFractional) {
          return new main.NumericValue(numericString, "bigDecimal");
        } else {
          return BigInt(numericString);
        }
      }
    }
  }
  return value;
}
const collectBodyString = (streamBody, context) => main.collectBody(streamBody, context).then((body) => ((context == null ? void 0 : context.utf8Encoder) ?? main.toUtf8)(body));
const parseJsonBody = (streamBody, context) => collectBodyString(streamBody, context).then((encoded) => {
  if (encoded.length) {
    try {
      return JSON.parse(encoded);
    } catch (e) {
      if ((e == null ? void 0 : e.name) === "SyntaxError") {
        Object.defineProperty(e, "$responseBodyText", {
          value: encoded
        });
      }
      throw e;
    }
  }
  return {};
});
const loadRestJsonErrorCode = (output, data) => {
  const findKey = (object, key) => Object.keys(object).find((k) => k.toLowerCase() === key.toLowerCase());
  const sanitizeErrorCode = (rawValue) => {
    let cleanValue = rawValue;
    if (typeof cleanValue === "number") {
      cleanValue = cleanValue.toString();
    }
    if (cleanValue.indexOf(",") >= 0) {
      cleanValue = cleanValue.split(",")[0];
    }
    if (cleanValue.indexOf(":") >= 0) {
      cleanValue = cleanValue.split(":")[0];
    }
    if (cleanValue.indexOf("#") >= 0) {
      cleanValue = cleanValue.split("#")[1];
    }
    return cleanValue;
  };
  const headerKey = findKey(output.headers, "x-amzn-errortype");
  if (headerKey !== void 0) {
    return sanitizeErrorCode(output.headers[headerKey]);
  }
  if (data && typeof data === "object") {
    const codeKey = findKey(data, "code");
    if (codeKey && data[codeKey] !== void 0) {
      return sanitizeErrorCode(data[codeKey]);
    }
    if (data["__type"] !== void 0) {
      return sanitizeErrorCode(data["__type"]);
    }
  }
};
class JsonShapeDeserializer extends main.SerdeContextConfig {
  constructor(settings) {
    super();
    __publicField(this, "settings");
    this.settings = settings;
  }
  async read(schema, data) {
    return this._read(schema, typeof data === "string" ? JSON.parse(data, jsonReviver) : await parseJsonBody(data, this.serdeContext));
  }
  readObject(schema, data) {
    return this._read(schema, data);
  }
  _read(schema, value) {
    const isObject = value !== null && typeof value === "object";
    const ns = main.NormalizedSchema.of(schema);
    if (ns.isListSchema() && Array.isArray(value)) {
      const listMember = ns.getValueSchema();
      const out = [];
      const sparse = !!ns.getMergedTraits().sparse;
      for (const item of value) {
        if (sparse || item != null) {
          out.push(this._read(listMember, item));
        }
      }
      return out;
    } else if (ns.isMapSchema() && isObject) {
      const mapMember = ns.getValueSchema();
      const out = {};
      const sparse = !!ns.getMergedTraits().sparse;
      for (const [_k, _v] of Object.entries(value)) {
        if (sparse || _v != null) {
          out[_k] = this._read(mapMember, _v);
        }
      }
      return out;
    } else if (ns.isStructSchema() && isObject) {
      const out = {};
      for (const [memberName, memberSchema] of main.deserializingStructIterator(ns, value, this.settings.jsonName ? "jsonName" : false)) {
        const fromKey = this.settings.jsonName ? memberSchema.getMergedTraits().jsonName ?? memberName : memberName;
        const deserializedValue = this._read(memberSchema, value[fromKey]);
        if (deserializedValue != null) {
          out[memberName] = deserializedValue;
        }
      }
      return out;
    }
    if (ns.isBlobSchema() && typeof value === "string") {
      return main.fromBase64(value);
    }
    const mediaType = ns.getMergedTraits().mediaType;
    if (ns.isStringSchema() && typeof value === "string" && mediaType) {
      const isJson = mediaType === "application/json" || mediaType.endsWith("+json");
      if (isJson) {
        return main.LazyJsonString.from(value);
      }
    }
    if (ns.isTimestampSchema() && value != null) {
      const format = main.determineTimestampFormat(ns, this.settings);
      switch (format) {
        case 5:
          return main.parseRfc3339DateTimeWithOffset(value);
        case 6:
          return main.parseRfc7231DateTime(value);
        case 7:
          return main.parseEpochTimestamp(value);
        default:
          console.warn("Missing timestamp format, parsing value with Date constructor:", value);
          return new Date(value);
      }
    }
    if (ns.isBigIntegerSchema() && (typeof value === "number" || typeof value === "string")) {
      return BigInt(value);
    }
    if (ns.isBigDecimalSchema() && value != void 0) {
      if (value instanceof main.NumericValue) {
        return value;
      }
      const untyped = value;
      if (untyped.type === "bigDecimal" && "string" in untyped) {
        return new main.NumericValue(untyped.string, untyped.type);
      }
      return new main.NumericValue(String(value), "bigDecimal");
    }
    if (ns.isNumericSchema() && typeof value === "string") {
      switch (value) {
        case "Infinity":
          return Infinity;
        case "-Infinity":
          return -Infinity;
        case "NaN":
          return NaN;
      }
    }
    if (ns.isDocumentSchema()) {
      if (isObject) {
        const out = Array.isArray(value) ? [] : {};
        for (const [k, v] of Object.entries(value)) {
          if (v instanceof main.NumericValue) {
            out[k] = v;
          } else {
            out[k] = this._read(ns, v);
          }
        }
        return out;
      } else {
        return structuredClone(value);
      }
    }
    return value;
  }
}
const NUMERIC_CONTROL_CHAR = String.fromCharCode(925);
class JsonReplacer {
  constructor() {
    __publicField(this, "values", /* @__PURE__ */ new Map());
    __publicField(this, "counter", 0);
    __publicField(this, "stage", 0);
  }
  createReplacer() {
    if (this.stage === 1) {
      throw new Error("@aws-sdk/core/protocols - JsonReplacer already created.");
    }
    if (this.stage === 2) {
      throw new Error("@aws-sdk/core/protocols - JsonReplacer exhausted.");
    }
    this.stage = 1;
    return (key, value) => {
      if (value instanceof main.NumericValue) {
        const v = `${NUMERIC_CONTROL_CHAR + "nv" + this.counter++}_` + value.string;
        this.values.set(`"${v}"`, value.string);
        return v;
      }
      if (typeof value === "bigint") {
        const s = value.toString();
        const v = `${NUMERIC_CONTROL_CHAR + "b" + this.counter++}_` + s;
        this.values.set(`"${v}"`, s);
        return v;
      }
      return value;
    };
  }
  replaceInJson(json) {
    if (this.stage === 0) {
      throw new Error("@aws-sdk/core/protocols - JsonReplacer not created yet.");
    }
    if (this.stage === 2) {
      throw new Error("@aws-sdk/core/protocols - JsonReplacer exhausted.");
    }
    this.stage = 2;
    if (this.counter === 0) {
      return json;
    }
    for (const [key, value] of this.values) {
      json = json.replace(key, value);
    }
    return json;
  }
}
class JsonShapeSerializer extends main.SerdeContextConfig {
  constructor(settings) {
    super();
    __publicField(this, "settings");
    __publicField(this, "buffer");
    __publicField(this, "rootSchema");
    this.settings = settings;
  }
  write(schema, value) {
    this.rootSchema = main.NormalizedSchema.of(schema);
    this.buffer = this._write(this.rootSchema, value);
  }
  writeDiscriminatedDocument(schema, value) {
    this.write(schema, value);
    if (typeof this.buffer === "object") {
      this.buffer.__type = main.NormalizedSchema.of(schema).getName(true);
    }
  }
  flush() {
    const { rootSchema } = this;
    this.rootSchema = void 0;
    if ((rootSchema == null ? void 0 : rootSchema.isStructSchema()) || (rootSchema == null ? void 0 : rootSchema.isDocumentSchema())) {
      const replacer = new JsonReplacer();
      return replacer.replaceInJson(JSON.stringify(this.buffer, replacer.createReplacer(), 0));
    }
    return this.buffer;
  }
  _write(schema, value, container) {
    var _a;
    const isObject = value !== null && typeof value === "object";
    const ns = main.NormalizedSchema.of(schema);
    if (ns.isListSchema() && Array.isArray(value)) {
      const listMember = ns.getValueSchema();
      const out = [];
      const sparse = !!ns.getMergedTraits().sparse;
      for (const item of value) {
        if (sparse || item != null) {
          out.push(this._write(listMember, item));
        }
      }
      return out;
    } else if (ns.isMapSchema() && isObject) {
      const mapMember = ns.getValueSchema();
      const out = {};
      const sparse = !!ns.getMergedTraits().sparse;
      for (const [_k, _v] of Object.entries(value)) {
        if (sparse || _v != null) {
          out[_k] = this._write(mapMember, _v);
        }
      }
      return out;
    } else if (ns.isStructSchema() && isObject) {
      const out = {};
      for (const [memberName, memberSchema] of main.serializingStructIterator(ns, value)) {
        const serializableValue = this._write(memberSchema, value[memberName], ns);
        if (serializableValue !== void 0) {
          const targetKey = this.settings.jsonName ? memberSchema.getMergedTraits().jsonName ?? memberName : memberName;
          out[targetKey] = serializableValue;
        }
      }
      return out;
    }
    if (value === null && (container == null ? void 0 : container.isStructSchema())) {
      return void 0;
    }
    if (ns.isBlobSchema() && (value instanceof Uint8Array || typeof value === "string") || ns.isDocumentSchema() && value instanceof Uint8Array) {
      if (ns === this.rootSchema) {
        return value;
      }
      return (((_a = this.serdeContext) == null ? void 0 : _a.base64Encoder) ?? main.toBase64)(value);
    }
    if ((ns.isTimestampSchema() || ns.isDocumentSchema()) && value instanceof Date) {
      const format = main.determineTimestampFormat(ns, this.settings);
      switch (format) {
        case 5:
          return value.toISOString().replace(".000Z", "Z");
        case 6:
          return main.dateToUtcString(value);
        case 7:
          return value.getTime() / 1e3;
        default:
          console.warn("Missing timestamp format, using epoch seconds", value);
          return value.getTime() / 1e3;
      }
    }
    if (ns.isNumericSchema() && typeof value === "number") {
      if (Math.abs(value) === Infinity || isNaN(value)) {
        return String(value);
      }
    }
    if (ns.isStringSchema()) {
      if (typeof value === "undefined" && ns.isIdempotencyToken()) {
        return main.v4();
      }
      const mediaType = ns.getMergedTraits().mediaType;
      if (value != null && mediaType) {
        const isJson = mediaType === "application/json" || mediaType.endsWith("+json");
        if (isJson) {
          return main.LazyJsonString.from(value);
        }
      }
    }
    if (ns.isDocumentSchema()) {
      if (isObject) {
        const out = Array.isArray(value) ? [] : {};
        for (const [k, v] of Object.entries(value)) {
          if (v instanceof main.NumericValue) {
            out[k] = v;
          } else {
            out[k] = this._write(ns, v);
          }
        }
        return out;
      } else {
        return structuredClone(value);
      }
    }
    return value;
  }
}
class JsonCodec extends main.SerdeContextConfig {
  constructor(settings) {
    super();
    __publicField(this, "settings");
    this.settings = settings;
  }
  createSerializer() {
    const serializer = new JsonShapeSerializer(this.settings);
    serializer.setSerdeContext(this.serdeContext);
    return serializer;
  }
  createDeserializer() {
    const deserializer = new JsonShapeDeserializer(this.settings);
    deserializer.setSerdeContext(this.serdeContext);
    return deserializer;
  }
}
class AwsRestJsonProtocol extends main.HttpBindingProtocol {
  constructor({ defaultNamespace }) {
    super({
      defaultNamespace
    });
    __publicField(this, "serializer");
    __publicField(this, "deserializer");
    __publicField(this, "codec");
    __publicField(this, "mixin", new main.ProtocolLib());
    const settings = {
      timestampFormat: {
        useTrait: true,
        default: 7
      },
      httpBindings: true,
      jsonName: true
    };
    this.codec = new JsonCodec(settings);
    this.serializer = new main.HttpInterceptingShapeSerializer(this.codec.createSerializer(), settings);
    this.deserializer = new main.HttpInterceptingShapeDeserializer(this.codec.createDeserializer(), settings);
  }
  getShapeId() {
    return "aws.protocols#restJson1";
  }
  getPayloadCodec() {
    return this.codec;
  }
  setSerdeContext(serdeContext) {
    this.codec.setSerdeContext(serdeContext);
    super.setSerdeContext(serdeContext);
  }
  async serializeRequest(operationSchema, input, context) {
    const request = await super.serializeRequest(operationSchema, input, context);
    const inputSchema = main.NormalizedSchema.of(operationSchema.input);
    if (!request.headers["content-type"]) {
      const contentType = this.mixin.resolveRestContentType(this.getDefaultContentType(), inputSchema);
      if (contentType) {
        request.headers["content-type"] = contentType;
      }
    }
    if (request.body == null && request.headers["content-type"] === this.getDefaultContentType()) {
      request.body = "{}";
    }
    return request;
  }
  async deserializeResponse(operationSchema, context, response) {
    const output = await super.deserializeResponse(operationSchema, context, response);
    const outputSchema = main.NormalizedSchema.of(operationSchema.output);
    for (const [name, member] of outputSchema.structIterator()) {
      if (member.getMemberTraits().httpPayload && !(name in output)) {
        output[name] = null;
      }
    }
    return output;
  }
  async handleError(operationSchema, context, response, dataObject, metadata) {
    const errorIdentifier = loadRestJsonErrorCode(response, dataObject) ?? "Unknown";
    const { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(errorIdentifier, this.options.defaultNamespace, response, dataObject, metadata);
    const ns = main.NormalizedSchema.of(errorSchema);
    const message = dataObject.message ?? dataObject.Message ?? "Unknown";
    const ErrorCtor = main.TypeRegistry.for(errorSchema[1]).getErrorCtor(errorSchema) ?? Error;
    const exception = new ErrorCtor(message);
    await this.deserializeHttpMessage(errorSchema, context, response, dataObject);
    const output = {};
    for (const [name, member] of ns.structIterator()) {
      const target = member.getMergedTraits().jsonName ?? name;
      output[name] = this.codec.createDeserializer().readObject(member, dataObject[target]);
    }
    throw this.mixin.decorateServiceException(Object.assign(exception, errorMetadata, {
      $fault: ns.getMergedTraits().error,
      message
    }, output), dataObject);
  }
  getDefaultContentType() {
    return "application/json";
  }
}
exports.AwsRestJsonProtocol = AwsRestJsonProtocol;
