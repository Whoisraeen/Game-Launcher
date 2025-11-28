"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const main = require("./main-0EimHS6-.js");
const _package = require("./package-upLn0O5Z.js");
const noAuth = require("./noAuth-9irRa4FD.js");
class RpcProtocol extends main.HttpProtocol {
  async serializeRequest(operationSchema, input, context) {
    const serializer = this.serializer;
    const query = {};
    const headers = {};
    const endpoint = await context.endpoint();
    const ns = main.NormalizedSchema.of(operationSchema == null ? void 0 : operationSchema.input);
    const schema = ns.getSchema();
    let payload;
    const request = new main.HttpRequest({
      protocol: "",
      hostname: "",
      port: void 0,
      path: "/",
      fragment: void 0,
      query,
      headers,
      body: void 0
    });
    if (endpoint) {
      this.updateServiceEndpoint(request, endpoint);
      this.setHostPrefix(request, operationSchema, input);
    }
    const _input = {
      ...input
    };
    if (input) {
      const eventStreamMember = ns.getEventStreamMember();
      if (eventStreamMember) {
        if (_input[eventStreamMember]) {
          const initialRequest = {};
          for (const [memberName, memberSchema] of ns.structIterator()) {
            if (memberName !== eventStreamMember && _input[memberName]) {
              serializer.write(memberSchema, _input[memberName]);
              initialRequest[memberName] = serializer.flush();
            }
          }
          payload = await this.serializeEventStream({
            eventStream: _input[eventStreamMember],
            requestSchema: ns,
            initialRequest
          });
        }
      } else {
        serializer.write(schema, _input);
        payload = serializer.flush();
      }
    }
    request.headers = headers;
    request.query = query;
    request.body = payload;
    request.method = "POST";
    return request;
  }
  async deserializeResponse(operationSchema, context, response) {
    const deserializer = this.deserializer;
    const ns = main.NormalizedSchema.of(operationSchema.output);
    const dataObject = {};
    if (response.statusCode >= 300) {
      const bytes = await main.collectBody(response.body, context);
      if (bytes.byteLength > 0) {
        Object.assign(dataObject, await deserializer.read(15, bytes));
      }
      await this.handleError(operationSchema, context, response, dataObject, this.deserializeMetadata(response));
      throw new Error("@smithy/core/protocols - RPC Protocol error handler failed to throw.");
    }
    for (const header in response.headers) {
      const value = response.headers[header];
      delete response.headers[header];
      response.headers[header.toLowerCase()] = value;
    }
    const eventStreamMember = ns.getEventStreamMember();
    if (eventStreamMember) {
      dataObject[eventStreamMember] = await this.deserializeEventStream({
        response,
        responseSchema: ns,
        initialResponseContainer: dataObject
      });
    } else {
      const bytes = await main.collectBody(response.body, context);
      if (bytes.byteLength > 0) {
        Object.assign(dataObject, await deserializer.read(ns, bytes));
      }
    }
    dataObject.$metadata = this.deserializeMetadata(response);
    return dataObject;
  }
}
class QueryShapeSerializer extends main.SerdeContextConfig {
  constructor(settings) {
    super();
    __publicField(this, "settings");
    __publicField(this, "buffer");
    this.settings = settings;
  }
  write(schema, value, prefix = "") {
    var _a2;
    if (this.buffer === void 0) {
      this.buffer = "";
    }
    const ns = main.NormalizedSchema.of(schema);
    if (prefix && !prefix.endsWith(".")) {
      prefix += ".";
    }
    if (ns.isBlobSchema()) {
      if (typeof value === "string" || value instanceof Uint8Array) {
        this.writeKey(prefix);
        this.writeValue((((_a2 = this.serdeContext) == null ? void 0 : _a2.base64Encoder) ?? main.toBase64)(value));
      }
    } else if (ns.isBooleanSchema() || ns.isNumericSchema() || ns.isStringSchema()) {
      if (value != null) {
        this.writeKey(prefix);
        this.writeValue(String(value));
      } else if (ns.isIdempotencyToken()) {
        this.writeKey(prefix);
        this.writeValue(main.v4());
      }
    } else if (ns.isBigIntegerSchema()) {
      if (value != null) {
        this.writeKey(prefix);
        this.writeValue(String(value));
      }
    } else if (ns.isBigDecimalSchema()) {
      if (value != null) {
        this.writeKey(prefix);
        this.writeValue(value instanceof main.NumericValue ? value.string : String(value));
      }
    } else if (ns.isTimestampSchema()) {
      if (value instanceof Date) {
        this.writeKey(prefix);
        const format = main.determineTimestampFormat(ns, this.settings);
        switch (format) {
          case 5:
            this.writeValue(value.toISOString().replace(".000Z", "Z"));
            break;
          case 6:
            this.writeValue(main.dateToUtcString(value));
            break;
          case 7:
            this.writeValue(String(value.getTime() / 1e3));
            break;
        }
      }
    } else if (ns.isDocumentSchema()) {
      throw new Error(`@aws-sdk/core/protocols - QuerySerializer unsupported document type ${ns.getName(true)}`);
    } else if (ns.isListSchema()) {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          if (this.settings.serializeEmptyLists) {
            this.writeKey(prefix);
            this.writeValue("");
          }
        } else {
          const member = ns.getValueSchema();
          const flat = this.settings.flattenLists || ns.getMergedTraits().xmlFlattened;
          let i2 = 1;
          for (const item of value) {
            if (item == null) {
              continue;
            }
            const suffix = this.getKey("member", member.getMergedTraits().xmlName);
            const key = flat ? `${prefix}${i2}` : `${prefix}${suffix}.${i2}`;
            this.write(member, item, key);
            ++i2;
          }
        }
      }
    } else if (ns.isMapSchema()) {
      if (value && typeof value === "object") {
        const keySchema = ns.getKeySchema();
        const memberSchema = ns.getValueSchema();
        const flat = ns.getMergedTraits().xmlFlattened;
        let i2 = 1;
        for (const [k2, v2] of Object.entries(value)) {
          if (v2 == null) {
            continue;
          }
          const keySuffix = this.getKey("key", keySchema.getMergedTraits().xmlName);
          const key = flat ? `${prefix}${i2}.${keySuffix}` : `${prefix}entry.${i2}.${keySuffix}`;
          const valueSuffix = this.getKey("value", memberSchema.getMergedTraits().xmlName);
          const valueKey = flat ? `${prefix}${i2}.${valueSuffix}` : `${prefix}entry.${i2}.${valueSuffix}`;
          this.write(keySchema, k2, key);
          this.write(memberSchema, v2, valueKey);
          ++i2;
        }
      }
    } else if (ns.isStructSchema()) {
      if (value && typeof value === "object") {
        for (const [memberName, member] of main.serializingStructIterator(ns, value)) {
          if (value[memberName] == null && !member.isIdempotencyToken()) {
            continue;
          }
          const suffix = this.getKey(memberName, member.getMergedTraits().xmlName);
          const key = `${prefix}${suffix}`;
          this.write(member, value[memberName], key);
        }
      }
    } else if (ns.isUnitSchema()) ;
    else {
      throw new Error(`@aws-sdk/core/protocols - QuerySerializer unrecognized schema type ${ns.getName(true)}`);
    }
  }
  flush() {
    if (this.buffer === void 0) {
      throw new Error("@aws-sdk/core/protocols - QuerySerializer cannot flush with nothing written to buffer.");
    }
    const str = this.buffer;
    delete this.buffer;
    return str;
  }
  getKey(memberName, xmlName) {
    const key = xmlName ?? memberName;
    if (this.settings.capitalizeKeys) {
      return key[0].toUpperCase() + key.slice(1);
    }
    return key;
  }
  writeKey(key) {
    if (key.endsWith(".")) {
      key = key.slice(0, key.length - 1);
    }
    this.buffer += `&${main.extendedEncodeURIComponent(key)}=`;
  }
  writeValue(value) {
    this.buffer += main.extendedEncodeURIComponent(value);
  }
}
class AwsQueryProtocol extends RpcProtocol {
  constructor(options) {
    super({
      defaultNamespace: options.defaultNamespace
    });
    __publicField(this, "options");
    __publicField(this, "serializer");
    __publicField(this, "deserializer");
    __publicField(this, "mixin", new main.ProtocolLib());
    this.options = options;
    const settings = {
      timestampFormat: {
        useTrait: true,
        default: 5
      },
      httpBindings: false,
      xmlNamespace: options.xmlNamespace,
      serviceNamespace: options.defaultNamespace,
      serializeEmptyLists: true
    };
    this.serializer = new QueryShapeSerializer(settings);
    this.deserializer = new main.XmlShapeDeserializer(settings);
  }
  getShapeId() {
    return "aws.protocols#awsQuery";
  }
  setSerdeContext(serdeContext) {
    this.serializer.setSerdeContext(serdeContext);
    this.deserializer.setSerdeContext(serdeContext);
  }
  getPayloadCodec() {
    throw new Error("AWSQuery protocol has no payload codec.");
  }
  async serializeRequest(operationSchema, input, context) {
    const request = await super.serializeRequest(operationSchema, input, context);
    if (!request.path.endsWith("/")) {
      request.path += "/";
    }
    Object.assign(request.headers, {
      "content-type": `application/x-www-form-urlencoded`
    });
    if (main.deref(operationSchema.input) === "unit" || !request.body) {
      request.body = "";
    }
    const action = operationSchema.name.split("#")[1] ?? operationSchema.name;
    request.body = `Action=${action}&Version=${this.options.version}` + request.body;
    if (request.body.endsWith("&")) {
      request.body = request.body.slice(-1);
    }
    return request;
  }
  async deserializeResponse(operationSchema, context, response) {
    const deserializer = this.deserializer;
    const ns = main.NormalizedSchema.of(operationSchema.output);
    const dataObject = {};
    if (response.statusCode >= 300) {
      const bytes2 = await main.collectBody(response.body, context);
      if (bytes2.byteLength > 0) {
        Object.assign(dataObject, await deserializer.read(15, bytes2));
      }
      await this.handleError(operationSchema, context, response, dataObject, this.deserializeMetadata(response));
    }
    for (const header in response.headers) {
      const value = response.headers[header];
      delete response.headers[header];
      response.headers[header.toLowerCase()] = value;
    }
    const shortName = operationSchema.name.split("#")[1] ?? operationSchema.name;
    const awsQueryResultKey = ns.isStructSchema() && this.useNestedResult() ? shortName + "Result" : void 0;
    const bytes = await main.collectBody(response.body, context);
    if (bytes.byteLength > 0) {
      Object.assign(dataObject, await deserializer.read(ns, bytes, awsQueryResultKey));
    }
    const output = {
      $metadata: this.deserializeMetadata(response),
      ...dataObject
    };
    return output;
  }
  useNestedResult() {
    return true;
  }
  async handleError(operationSchema, context, response, dataObject, metadata) {
    const errorIdentifier = this.loadQueryErrorCode(response, dataObject) ?? "Unknown";
    const errorData = this.loadQueryError(dataObject);
    const message = this.loadQueryErrorMessage(dataObject);
    errorData.message = message;
    errorData.Error = {
      Type: errorData.Type,
      Code: errorData.Code,
      Message: message
    };
    const { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(errorIdentifier, this.options.defaultNamespace, response, errorData, metadata, (registry, errorName) => {
      try {
        return registry.getSchema(errorName);
      } catch (e2) {
        return registry.find((schema) => {
          var _a2;
          return ((_a2 = main.NormalizedSchema.of(schema).getMergedTraits().awsQueryError) == null ? void 0 : _a2[0]) === errorName;
        });
      }
    });
    const ns = main.NormalizedSchema.of(errorSchema);
    const ErrorCtor = main.TypeRegistry.for(errorSchema[1]).getErrorCtor(errorSchema) ?? Error;
    const exception = new ErrorCtor(message);
    const output = {
      Error: errorData.Error
    };
    for (const [name, member] of ns.structIterator()) {
      const target = member.getMergedTraits().xmlName ?? name;
      const value = errorData[target] ?? dataObject[target];
      output[name] = this.deserializer.readSchema(member, value);
    }
    throw this.mixin.decorateServiceException(Object.assign(exception, errorMetadata, {
      $fault: ns.getMergedTraits().error,
      message
    }, output), dataObject);
  }
  loadQueryErrorCode(output, data) {
    var _a2, _b, _c2, _d;
    const code = (_d = ((_b = (_a2 = data.Errors) == null ? void 0 : _a2[0]) == null ? void 0 : _b.Error) ?? ((_c2 = data.Errors) == null ? void 0 : _c2.Error) ?? data.Error) == null ? void 0 : _d.Code;
    if (code !== void 0) {
      return code;
    }
    if (output.statusCode == 404) {
      return "NotFound";
    }
  }
  loadQueryError(data) {
    var _a2, _b, _c2;
    return ((_b = (_a2 = data.Errors) == null ? void 0 : _a2[0]) == null ? void 0 : _b.Error) ?? ((_c2 = data.Errors) == null ? void 0 : _c2.Error) ?? data.Error;
  }
  loadQueryErrorMessage(data) {
    const errorData = this.loadQueryError(data);
    return (errorData == null ? void 0 : errorData.message) ?? (errorData == null ? void 0 : errorData.Message) ?? data.message ?? data.Message ?? "Unknown";
  }
  getDefaultContentType() {
    return "application/x-www-form-urlencoded";
  }
}
function stsRegionDefaultResolver(loaderConfig = {}) {
  return main.loadConfig({
    ...main.NODE_REGION_CONFIG_OPTIONS,
    async default() {
      {
        console.warn("@aws-sdk - WARN - default STS region of us-east-1 used. See @aws-sdk/credential-providers README and set a region explicitly.");
      }
      return "us-east-1";
    }
  }, { ...main.NODE_REGION_CONFIG_FILE_OPTIONS, ...loaderConfig });
}
const defaultSTSHttpAuthSchemeParametersProvider = async (config, context, input) => {
  return {
    operation: main.getSmithyContext(context).operation,
    region: await main.normalizeProvider(config.region)() || (() => {
      throw new Error("expected `region` to be configured for `aws.auth#sigv4`");
    })()
  };
};
function createAwsAuthSigv4HttpAuthOption(authParameters) {
  return {
    schemeId: "aws.auth#sigv4",
    signingProperties: {
      name: "sts",
      region: authParameters.region
    },
    propertiesExtractor: (config, context) => ({
      signingProperties: {
        config,
        context
      }
    })
  };
}
function createSmithyApiNoAuthHttpAuthOption(authParameters) {
  return {
    schemeId: "smithy.api#noAuth"
  };
}
const defaultSTSHttpAuthSchemeProvider = (authParameters) => {
  const options = [];
  switch (authParameters.operation) {
    case "AssumeRoleWithWebIdentity": {
      options.push(createSmithyApiNoAuthHttpAuthOption());
      break;
    }
    default: {
      options.push(createAwsAuthSigv4HttpAuthOption(authParameters));
    }
  }
  return options;
};
const resolveStsAuthConfig = (input) => Object.assign(input, {
  stsClientCtor: STSClient
});
const resolveHttpAuthSchemeConfig = (config) => {
  const config_0 = resolveStsAuthConfig(config);
  const config_1 = main.resolveAwsSdkSigV4Config(config_0);
  return Object.assign(config_1, {
    authSchemePreference: main.normalizeProvider(config.authSchemePreference ?? [])
  });
};
const resolveClientEndpointParameters = (options) => {
  return Object.assign(options, {
    useDualstackEndpoint: options.useDualstackEndpoint ?? false,
    useFipsEndpoint: options.useFipsEndpoint ?? false,
    useGlobalEndpoint: options.useGlobalEndpoint ?? false,
    defaultSigningName: "sts"
  });
};
const commonParams = {
  UseGlobalEndpoint: { type: "builtInParams", name: "useGlobalEndpoint" },
  UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
  Endpoint: { type: "builtInParams", name: "endpoint" },
  Region: { type: "builtInParams", name: "region" },
  UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
};
const F = "required", G = "type", H = "fn", I = "argv", J = "ref";
const a = false, b = true, c = "booleanEquals", d = "stringEquals", e = "sigv4", f = "sts", g = "us-east-1", h = "endpoint", i = "https://sts.{Region}.{PartitionResult#dnsSuffix}", j = "tree", k = "error", l = "getAttr", m = { [F]: false, [G]: "string" }, n = { [F]: true, "default": false, [G]: "boolean" }, o = { [J]: "Endpoint" }, p = { [H]: "isSet", [I]: [{ [J]: "Region" }] }, q = { [J]: "Region" }, r = { [H]: "aws.partition", [I]: [q], "assign": "PartitionResult" }, s = { [J]: "UseFIPS" }, t = { [J]: "UseDualStack" }, u = { "url": "https://sts.amazonaws.com", "properties": { "authSchemes": [{ "name": e, "signingName": f, "signingRegion": g }] }, "headers": {} }, v = {}, w = { "conditions": [{ [H]: d, [I]: [q, "aws-global"] }], [h]: u, [G]: h }, x = { [H]: c, [I]: [s, true] }, y = { [H]: c, [I]: [t, true] }, z = { [H]: l, [I]: [{ [J]: "PartitionResult" }, "supportsFIPS"] }, A = { [J]: "PartitionResult" }, B = { [H]: c, [I]: [true, { [H]: l, [I]: [A, "supportsDualStack"] }] }, C = [{ [H]: "isSet", [I]: [o] }], D = [x], E = [y];
const _data = { parameters: { Region: m, UseDualStack: n, UseFIPS: n, Endpoint: m, UseGlobalEndpoint: n }, rules: [{ conditions: [{ [H]: c, [I]: [{ [J]: "UseGlobalEndpoint" }, b] }, { [H]: "not", [I]: C }, p, r, { [H]: c, [I]: [s, a] }, { [H]: c, [I]: [t, a] }], rules: [{ conditions: [{ [H]: d, [I]: [q, "ap-northeast-1"] }], endpoint: u, [G]: h }, { conditions: [{ [H]: d, [I]: [q, "ap-south-1"] }], endpoint: u, [G]: h }, { conditions: [{ [H]: d, [I]: [q, "ap-southeast-1"] }], endpoint: u, [G]: h }, { conditions: [{ [H]: d, [I]: [q, "ap-southeast-2"] }], endpoint: u, [G]: h }, w, { conditions: [{ [H]: d, [I]: [q, "ca-central-1"] }], endpoint: u, [G]: h }, { conditions: [{ [H]: d, [I]: [q, "eu-central-1"] }], endpoint: u, [G]: h }, { conditions: [{ [H]: d, [I]: [q, "eu-north-1"] }], endpoint: u, [G]: h }, { conditions: [{ [H]: d, [I]: [q, "eu-west-1"] }], endpoint: u, [G]: h }, { conditions: [{ [H]: d, [I]: [q, "eu-west-2"] }], endpoint: u, [G]: h }, { conditions: [{ [H]: d, [I]: [q, "eu-west-3"] }], endpoint: u, [G]: h }, { conditions: [{ [H]: d, [I]: [q, "sa-east-1"] }], endpoint: u, [G]: h }, { conditions: [{ [H]: d, [I]: [q, g] }], endpoint: u, [G]: h }, { conditions: [{ [H]: d, [I]: [q, "us-east-2"] }], endpoint: u, [G]: h }, { conditions: [{ [H]: d, [I]: [q, "us-west-1"] }], endpoint: u, [G]: h }, { conditions: [{ [H]: d, [I]: [q, "us-west-2"] }], endpoint: u, [G]: h }, { endpoint: { url: i, properties: { authSchemes: [{ name: e, signingName: f, signingRegion: "{Region}" }] }, headers: v }, [G]: h }], [G]: j }, { conditions: C, rules: [{ conditions: D, error: "Invalid Configuration: FIPS and custom endpoint are not supported", [G]: k }, { conditions: E, error: "Invalid Configuration: Dualstack and custom endpoint are not supported", [G]: k }, { endpoint: { url: o, properties: v, headers: v }, [G]: h }], [G]: j }, { conditions: [p], rules: [{ conditions: [r], rules: [{ conditions: [x, y], rules: [{ conditions: [{ [H]: c, [I]: [b, z] }, B], rules: [{ endpoint: { url: "https://sts-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: v, headers: v }, [G]: h }], [G]: j }, { error: "FIPS and DualStack are enabled, but this partition does not support one or both", [G]: k }], [G]: j }, { conditions: D, rules: [{ conditions: [{ [H]: c, [I]: [z, b] }], rules: [{ conditions: [{ [H]: d, [I]: [{ [H]: l, [I]: [A, "name"] }, "aws-us-gov"] }], endpoint: { url: "https://sts.{Region}.amazonaws.com", properties: v, headers: v }, [G]: h }, { endpoint: { url: "https://sts-fips.{Region}.{PartitionResult#dnsSuffix}", properties: v, headers: v }, [G]: h }], [G]: j }, { error: "FIPS is enabled but this partition does not support FIPS", [G]: k }], [G]: j }, { conditions: E, rules: [{ conditions: [B], rules: [{ endpoint: { url: "https://sts.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: v, headers: v }, [G]: h }], [G]: j }, { error: "DualStack is enabled but this partition does not support DualStack", [G]: k }], [G]: j }, w, { endpoint: { url: i, properties: v, headers: v }, [G]: h }], [G]: j }], [G]: j }, { error: "Invalid Configuration: Missing Region", [G]: k }] };
const ruleSet = _data;
const cache = new main.EndpointCache({
  size: 50,
  params: ["Endpoint", "Region", "UseDualStack", "UseFIPS", "UseGlobalEndpoint"]
});
const defaultEndpointResolver = (endpointParams, context = {}) => {
  return cache.get(endpointParams, () => main.resolveEndpoint(ruleSet, {
    endpointParams,
    logger: context.logger
  }));
};
main.customEndpointFunctions.aws = main.awsEndpointFunctions;
const getRuntimeConfig$1 = (config) => {
  return {
    apiVersion: "2011-06-15",
    base64Decoder: (config == null ? void 0 : config.base64Decoder) ?? main.fromBase64,
    base64Encoder: (config == null ? void 0 : config.base64Encoder) ?? main.toBase64,
    disableHostPrefix: (config == null ? void 0 : config.disableHostPrefix) ?? false,
    endpointProvider: (config == null ? void 0 : config.endpointProvider) ?? defaultEndpointResolver,
    extensions: (config == null ? void 0 : config.extensions) ?? [],
    httpAuthSchemeProvider: (config == null ? void 0 : config.httpAuthSchemeProvider) ?? defaultSTSHttpAuthSchemeProvider,
    httpAuthSchemes: (config == null ? void 0 : config.httpAuthSchemes) ?? [
      {
        schemeId: "aws.auth#sigv4",
        identityProvider: (ipc) => ipc.getIdentityProvider("aws.auth#sigv4"),
        signer: new main.AwsSdkSigV4Signer()
      },
      {
        schemeId: "smithy.api#noAuth",
        identityProvider: (ipc) => ipc.getIdentityProvider("smithy.api#noAuth") || (async () => ({})),
        signer: new noAuth.NoAuthSigner()
      }
    ],
    logger: (config == null ? void 0 : config.logger) ?? new main.NoOpLogger(),
    protocol: (config == null ? void 0 : config.protocol) ?? new AwsQueryProtocol({
      defaultNamespace: "com.amazonaws.sts",
      xmlNamespace: "https://sts.amazonaws.com/doc/2011-06-15/",
      version: "2011-06-15"
    }),
    serviceId: (config == null ? void 0 : config.serviceId) ?? "STS",
    urlParser: (config == null ? void 0 : config.urlParser) ?? main.parseUrl,
    utf8Decoder: (config == null ? void 0 : config.utf8Decoder) ?? main.fromUtf8,
    utf8Encoder: (config == null ? void 0 : config.utf8Encoder) ?? main.toUtf8
  };
};
const getRuntimeConfig = (config) => {
  main.emitWarningIfUnsupportedVersion(process.version);
  const defaultsMode = main.resolveDefaultsModeConfig(config);
  const defaultConfigProvider = () => defaultsMode().then(main.loadConfigsForDefaultMode);
  const clientSharedValues = getRuntimeConfig$1(config);
  main.emitWarningIfUnsupportedVersion$1(process.version);
  const loaderConfig = {
    profile: config == null ? void 0 : config.profile,
    logger: clientSharedValues.logger
  };
  return {
    ...clientSharedValues,
    ...config,
    runtime: "node",
    defaultsMode,
    authSchemePreference: (config == null ? void 0 : config.authSchemePreference) ?? main.loadConfig(main.NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, loaderConfig),
    bodyLengthChecker: (config == null ? void 0 : config.bodyLengthChecker) ?? main.calculateBodyLength,
    defaultUserAgentProvider: (config == null ? void 0 : config.defaultUserAgentProvider) ?? main.createDefaultUserAgentProvider({ serviceId: clientSharedValues.serviceId, clientVersion: _package.packageInfo.version }),
    httpAuthSchemes: (config == null ? void 0 : config.httpAuthSchemes) ?? [
      {
        schemeId: "aws.auth#sigv4",
        identityProvider: (ipc) => ipc.getIdentityProvider("aws.auth#sigv4") || (async (idProps) => await config.credentialDefaultProvider((idProps == null ? void 0 : idProps.__config) || {})()),
        signer: new main.AwsSdkSigV4Signer()
      },
      {
        schemeId: "smithy.api#noAuth",
        identityProvider: (ipc) => ipc.getIdentityProvider("smithy.api#noAuth") || (async () => ({})),
        signer: new noAuth.NoAuthSigner()
      }
    ],
    maxAttempts: (config == null ? void 0 : config.maxAttempts) ?? main.loadConfig(main.NODE_MAX_ATTEMPT_CONFIG_OPTIONS, config),
    region: (config == null ? void 0 : config.region) ?? main.loadConfig(main.NODE_REGION_CONFIG_OPTIONS, { ...main.NODE_REGION_CONFIG_FILE_OPTIONS, ...loaderConfig }),
    requestHandler: main.NodeHttpHandler.create((config == null ? void 0 : config.requestHandler) ?? defaultConfigProvider),
    retryMode: (config == null ? void 0 : config.retryMode) ?? main.loadConfig({
      ...main.NODE_RETRY_MODE_CONFIG_OPTIONS,
      default: async () => (await defaultConfigProvider()).retryMode || main.DEFAULT_RETRY_MODE
    }, config),
    sha256: (config == null ? void 0 : config.sha256) ?? main.Hash.bind(null, "sha256"),
    streamCollector: (config == null ? void 0 : config.streamCollector) ?? main.streamCollector,
    useDualstackEndpoint: (config == null ? void 0 : config.useDualstackEndpoint) ?? main.loadConfig(main.NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
    useFipsEndpoint: (config == null ? void 0 : config.useFipsEndpoint) ?? main.loadConfig(main.NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
    userAgentAppId: (config == null ? void 0 : config.userAgentAppId) ?? main.loadConfig(main.NODE_APP_ID_CONFIG_OPTIONS, loaderConfig)
  };
};
const getHttpAuthExtensionConfiguration = (runtimeConfig) => {
  const _httpAuthSchemes = runtimeConfig.httpAuthSchemes;
  let _httpAuthSchemeProvider = runtimeConfig.httpAuthSchemeProvider;
  let _credentials = runtimeConfig.credentials;
  return {
    setHttpAuthScheme(httpAuthScheme) {
      const index = _httpAuthSchemes.findIndex((scheme) => scheme.schemeId === httpAuthScheme.schemeId);
      if (index === -1) {
        _httpAuthSchemes.push(httpAuthScheme);
      } else {
        _httpAuthSchemes.splice(index, 1, httpAuthScheme);
      }
    },
    httpAuthSchemes() {
      return _httpAuthSchemes;
    },
    setHttpAuthSchemeProvider(httpAuthSchemeProvider) {
      _httpAuthSchemeProvider = httpAuthSchemeProvider;
    },
    httpAuthSchemeProvider() {
      return _httpAuthSchemeProvider;
    },
    setCredentials(credentials) {
      _credentials = credentials;
    },
    credentials() {
      return _credentials;
    }
  };
};
const resolveHttpAuthRuntimeConfig = (config) => {
  return {
    httpAuthSchemes: config.httpAuthSchemes(),
    httpAuthSchemeProvider: config.httpAuthSchemeProvider(),
    credentials: config.credentials()
  };
};
const resolveRuntimeExtensions = (runtimeConfig, extensions) => {
  const extensionConfiguration = Object.assign(main.getAwsRegionExtensionConfiguration(runtimeConfig), main.getDefaultExtensionConfiguration(runtimeConfig), main.getHttpHandlerExtensionConfiguration(runtimeConfig), getHttpAuthExtensionConfiguration(runtimeConfig));
  extensions.forEach((extension) => extension.configure(extensionConfiguration));
  return Object.assign(runtimeConfig, main.resolveAwsRegionExtensionConfiguration(extensionConfiguration), main.resolveDefaultRuntimeConfig(extensionConfiguration), main.resolveHttpHandlerRuntimeConfig(extensionConfiguration), resolveHttpAuthRuntimeConfig(extensionConfiguration));
};
class STSClient extends main.Client {
  constructor(...[configuration]) {
    const _config_0 = getRuntimeConfig(configuration || {});
    super(_config_0);
    __publicField(this, "config");
    this.initConfig = _config_0;
    const _config_1 = resolveClientEndpointParameters(_config_0);
    const _config_2 = main.resolveUserAgentConfig(_config_1);
    const _config_3 = main.resolveRetryConfig(_config_2);
    const _config_4 = main.resolveRegionConfig(_config_3);
    const _config_5 = main.resolveHostHeaderConfig(_config_4);
    const _config_6 = main.resolveEndpointConfig(_config_5);
    const _config_7 = resolveHttpAuthSchemeConfig(_config_6);
    const _config_8 = resolveRuntimeExtensions(_config_7, (configuration == null ? void 0 : configuration.extensions) || []);
    this.config = _config_8;
    this.middlewareStack.use(main.getSchemaSerdePlugin(this.config));
    this.middlewareStack.use(main.getUserAgentPlugin(this.config));
    this.middlewareStack.use(main.getRetryPlugin(this.config));
    this.middlewareStack.use(main.getContentLengthPlugin(this.config));
    this.middlewareStack.use(main.getHostHeaderPlugin(this.config));
    this.middlewareStack.use(main.getLoggerPlugin(this.config));
    this.middlewareStack.use(main.getRecursionDetectionPlugin(this.config));
    this.middlewareStack.use(main.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
      httpAuthSchemeParametersProvider: defaultSTSHttpAuthSchemeParametersProvider,
      identityProviderConfigProvider: async (config) => new main.DefaultIdentityProviderConfig({
        "aws.auth#sigv4": config.credentials
      })
    }));
    this.middlewareStack.use(main.getHttpSigningPlugin(this.config));
  }
  destroy() {
    super.destroy();
  }
}
let STSServiceException$1 = class STSServiceException extends main.ServiceException {
  constructor(options) {
    super(options);
    Object.setPrototypeOf(this, STSServiceException.prototype);
  }
};
let ExpiredTokenException$1 = class ExpiredTokenException extends STSServiceException$1 {
  constructor(opts) {
    super({
      name: "ExpiredTokenException",
      $fault: "client",
      ...opts
    });
    __publicField(this, "name", "ExpiredTokenException");
    __publicField(this, "$fault", "client");
    Object.setPrototypeOf(this, ExpiredTokenException.prototype);
  }
};
let MalformedPolicyDocumentException$1 = class MalformedPolicyDocumentException extends STSServiceException$1 {
  constructor(opts) {
    super({
      name: "MalformedPolicyDocumentException",
      $fault: "client",
      ...opts
    });
    __publicField(this, "name", "MalformedPolicyDocumentException");
    __publicField(this, "$fault", "client");
    Object.setPrototypeOf(this, MalformedPolicyDocumentException.prototype);
  }
};
let PackedPolicyTooLargeException$1 = class PackedPolicyTooLargeException extends STSServiceException$1 {
  constructor(opts) {
    super({
      name: "PackedPolicyTooLargeException",
      $fault: "client",
      ...opts
    });
    __publicField(this, "name", "PackedPolicyTooLargeException");
    __publicField(this, "$fault", "client");
    Object.setPrototypeOf(this, PackedPolicyTooLargeException.prototype);
  }
};
let RegionDisabledException$1 = class RegionDisabledException extends STSServiceException$1 {
  constructor(opts) {
    super({
      name: "RegionDisabledException",
      $fault: "client",
      ...opts
    });
    __publicField(this, "name", "RegionDisabledException");
    __publicField(this, "$fault", "client");
    Object.setPrototypeOf(this, RegionDisabledException.prototype);
  }
};
let IDPRejectedClaimException$1 = class IDPRejectedClaimException extends STSServiceException$1 {
  constructor(opts) {
    super({
      name: "IDPRejectedClaimException",
      $fault: "client",
      ...opts
    });
    __publicField(this, "name", "IDPRejectedClaimException");
    __publicField(this, "$fault", "client");
    Object.setPrototypeOf(this, IDPRejectedClaimException.prototype);
  }
};
let InvalidIdentityTokenException$1 = class InvalidIdentityTokenException extends STSServiceException$1 {
  constructor(opts) {
    super({
      name: "InvalidIdentityTokenException",
      $fault: "client",
      ...opts
    });
    __publicField(this, "name", "InvalidIdentityTokenException");
    __publicField(this, "$fault", "client");
    Object.setPrototypeOf(this, InvalidIdentityTokenException.prototype);
  }
};
let IDPCommunicationErrorException$1 = class IDPCommunicationErrorException extends STSServiceException$1 {
  constructor(opts) {
    super({
      name: "IDPCommunicationErrorException",
      $fault: "client",
      ...opts
    });
    __publicField(this, "name", "IDPCommunicationErrorException");
    __publicField(this, "$fault", "client");
    Object.setPrototypeOf(this, IDPCommunicationErrorException.prototype);
  }
};
const _A = "Arn";
const _AKI = "AccessKeyId";
const _AR = "AssumeRole";
const _ARI = "AssumedRoleId";
const _ARR = "AssumeRoleRequest";
const _ARRs = "AssumeRoleResponse";
const _ARU = "AssumedRoleUser";
const _ARWWI = "AssumeRoleWithWebIdentity";
const _ARWWIR = "AssumeRoleWithWebIdentityRequest";
const _ARWWIRs = "AssumeRoleWithWebIdentityResponse";
const _Au = "Audience";
const _C = "Credentials";
const _CA = "ContextAssertion";
const _DS = "DurationSeconds";
const _E = "Expiration";
const _EI = "ExternalId";
const _ETE = "ExpiredTokenException";
const _IDPCEE = "IDPCommunicationErrorException";
const _IDPRCE = "IDPRejectedClaimException";
const _IITE = "InvalidIdentityTokenException";
const _K = "Key";
const _MPDE = "MalformedPolicyDocumentException";
const _P = "Policy";
const _PA = "PolicyArns";
const _PAr = "ProviderArn";
const _PC = "ProvidedContexts";
const _PCLT = "ProvidedContextsListType";
const _PCr = "ProvidedContext";
const _PDT = "PolicyDescriptorType";
const _PI = "ProviderId";
const _PPS = "PackedPolicySize";
const _PPTLE = "PackedPolicyTooLargeException";
const _Pr = "Provider";
const _RA = "RoleArn";
const _RDE = "RegionDisabledException";
const _RSN = "RoleSessionName";
const _SAK = "SecretAccessKey";
const _SFWIT = "SubjectFromWebIdentityToken";
const _SI = "SourceIdentity";
const _SN = "SerialNumber";
const _ST = "SessionToken";
const _T = "Tags";
const _TC = "TokenCode";
const _TTK = "TransitiveTagKeys";
const _Ta = "Tag";
const _V = "Value";
const _WIT = "WebIdentityToken";
const _a = "arn";
const _aKST = "accessKeySecretType";
const _aQE = "awsQueryError";
const _c = "client";
const _cTT = "clientTokenType";
const _e = "error";
const _hE = "httpError";
const _m = "message";
const _pDLT = "policyDescriptorListType";
const _s = "smithy.ts.sdk.synthetic.com.amazonaws.sts";
const _tLT = "tagListType";
const n0 = "com.amazonaws.sts";
var accessKeySecretType = [0, n0, _aKST, 8, 0];
var clientTokenType = [0, n0, _cTT, 8, 0];
var AssumedRoleUser = [3, n0, _ARU, 0, [_ARI, _A], [0, 0]];
var AssumeRoleRequest = [
  3,
  n0,
  _ARR,
  0,
  [_RA, _RSN, _PA, _P, _DS, _T, _TTK, _EI, _SN, _TC, _SI, _PC],
  [0, 0, () => policyDescriptorListType, 0, 1, () => tagListType, 64 | 0, 0, 0, 0, 0, () => ProvidedContextsListType]
];
var AssumeRoleResponse = [
  3,
  n0,
  _ARRs,
  0,
  [_C, _ARU, _PPS, _SI],
  [[() => Credentials, 0], () => AssumedRoleUser, 1, 0]
];
var AssumeRoleWithWebIdentityRequest = [
  3,
  n0,
  _ARWWIR,
  0,
  [_RA, _RSN, _WIT, _PI, _PA, _P, _DS],
  [0, 0, [() => clientTokenType, 0], 0, () => policyDescriptorListType, 0, 1]
];
var AssumeRoleWithWebIdentityResponse = [
  3,
  n0,
  _ARWWIRs,
  0,
  [_C, _SFWIT, _ARU, _PPS, _Pr, _Au, _SI],
  [[() => Credentials, 0], 0, () => AssumedRoleUser, 1, 0, 0, 0]
];
var Credentials = [
  3,
  n0,
  _C,
  0,
  [_AKI, _SAK, _ST, _E],
  [0, [() => accessKeySecretType, 0], 0, 4]
];
var ExpiredTokenException2 = [
  -3,
  n0,
  _ETE,
  {
    [_e]: _c,
    [_hE]: 400,
    [_aQE]: [`ExpiredTokenException`, 400]
  },
  [_m],
  [0]
];
main.TypeRegistry.for(n0).registerError(ExpiredTokenException2, ExpiredTokenException$1);
var IDPCommunicationErrorException2 = [
  -3,
  n0,
  _IDPCEE,
  {
    [_e]: _c,
    [_hE]: 400,
    [_aQE]: [`IDPCommunicationError`, 400]
  },
  [_m],
  [0]
];
main.TypeRegistry.for(n0).registerError(IDPCommunicationErrorException2, IDPCommunicationErrorException$1);
var IDPRejectedClaimException2 = [
  -3,
  n0,
  _IDPRCE,
  {
    [_e]: _c,
    [_hE]: 403,
    [_aQE]: [`IDPRejectedClaim`, 403]
  },
  [_m],
  [0]
];
main.TypeRegistry.for(n0).registerError(IDPRejectedClaimException2, IDPRejectedClaimException$1);
var InvalidIdentityTokenException2 = [
  -3,
  n0,
  _IITE,
  {
    [_e]: _c,
    [_hE]: 400,
    [_aQE]: [`InvalidIdentityToken`, 400]
  },
  [_m],
  [0]
];
main.TypeRegistry.for(n0).registerError(InvalidIdentityTokenException2, InvalidIdentityTokenException$1);
var MalformedPolicyDocumentException2 = [
  -3,
  n0,
  _MPDE,
  {
    [_e]: _c,
    [_hE]: 400,
    [_aQE]: [`MalformedPolicyDocument`, 400]
  },
  [_m],
  [0]
];
main.TypeRegistry.for(n0).registerError(MalformedPolicyDocumentException2, MalformedPolicyDocumentException$1);
var PackedPolicyTooLargeException2 = [
  -3,
  n0,
  _PPTLE,
  {
    [_e]: _c,
    [_hE]: 400,
    [_aQE]: [`PackedPolicyTooLarge`, 400]
  },
  [_m],
  [0]
];
main.TypeRegistry.for(n0).registerError(PackedPolicyTooLargeException2, PackedPolicyTooLargeException$1);
var PolicyDescriptorType = [3, n0, _PDT, 0, [_a], [0]];
var ProvidedContext = [3, n0, _PCr, 0, [_PAr, _CA], [0, 0]];
var RegionDisabledException2 = [
  -3,
  n0,
  _RDE,
  {
    [_e]: _c,
    [_hE]: 403,
    [_aQE]: [`RegionDisabledException`, 403]
  },
  [_m],
  [0]
];
main.TypeRegistry.for(n0).registerError(RegionDisabledException2, RegionDisabledException$1);
var Tag = [3, n0, _Ta, 0, [_K, _V], [0, 0]];
var STSServiceException2 = [-3, _s, "STSServiceException", 0, [], []];
main.TypeRegistry.for(_s).registerError(STSServiceException2, STSServiceException$1);
var policyDescriptorListType = [1, n0, _pDLT, 0, () => PolicyDescriptorType];
var ProvidedContextsListType = [1, n0, _PCLT, 0, () => ProvidedContext];
var tagListType = [1, n0, _tLT, 0, () => Tag];
var AssumeRole = [9, n0, _AR, 0, () => AssumeRoleRequest, () => AssumeRoleResponse];
var AssumeRoleWithWebIdentity = [
  9,
  n0,
  _ARWWI,
  0,
  () => AssumeRoleWithWebIdentityRequest,
  () => AssumeRoleWithWebIdentityResponse
];
class AssumeRoleCommand extends main.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o2) {
  return [main.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
}).s("AWSSecurityTokenServiceV20110615", "AssumeRole", {}).n("STSClient", "AssumeRoleCommand").sc(AssumeRole).build() {
}
class AssumeRoleWithWebIdentityCommand extends main.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o2) {
  return [main.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
}).s("AWSSecurityTokenServiceV20110615", "AssumeRoleWithWebIdentity", {}).n("STSClient", "AssumeRoleWithWebIdentityCommand").sc(AssumeRoleWithWebIdentity).build() {
}
const getAccountIdFromAssumedRoleUser = (assumedRoleUser) => {
  if (typeof (assumedRoleUser == null ? void 0 : assumedRoleUser.Arn) === "string") {
    const arnComponents = assumedRoleUser.Arn.split(":");
    if (arnComponents.length > 4 && arnComponents[4] !== "") {
      return arnComponents[4];
    }
  }
  return void 0;
};
const resolveRegion = async (_region, _parentRegion, credentialProviderLogger, loaderConfig = {}) => {
  var _a2;
  const region = typeof _region === "function" ? await _region() : _region;
  const parentRegion = typeof _parentRegion === "function" ? await _parentRegion() : _parentRegion;
  const stsDefaultRegion = await stsRegionDefaultResolver(loaderConfig)();
  (_a2 = credentialProviderLogger == null ? void 0 : credentialProviderLogger.debug) == null ? void 0 : _a2.call(credentialProviderLogger, "@aws-sdk/client-sts::resolveRegion", "accepting first of:", `${region} (credential provider clientConfig)`, `${parentRegion} (contextual client)`, `${stsDefaultRegion} (STS default: AWS_REGION, profile region, or us-east-1)`);
  return region ?? parentRegion ?? stsDefaultRegion;
};
const getDefaultRoleAssumer$1 = (stsOptions, STSClient2) => {
  let stsClient;
  let closureSourceCreds;
  return async (sourceCreds, params) => {
    var _a2, _b, _c2, _d, _e2;
    closureSourceCreds = sourceCreds;
    if (!stsClient) {
      const { logger = (_a2 = stsOptions == null ? void 0 : stsOptions.parentClientConfig) == null ? void 0 : _a2.logger, profile = (_b = stsOptions == null ? void 0 : stsOptions.parentClientConfig) == null ? void 0 : _b.profile, region, requestHandler = (_c2 = stsOptions == null ? void 0 : stsOptions.parentClientConfig) == null ? void 0 : _c2.requestHandler, credentialProviderLogger, userAgentAppId = (_d = stsOptions == null ? void 0 : stsOptions.parentClientConfig) == null ? void 0 : _d.userAgentAppId } = stsOptions;
      const resolvedRegion = await resolveRegion(region, (_e2 = stsOptions == null ? void 0 : stsOptions.parentClientConfig) == null ? void 0 : _e2.region, credentialProviderLogger, {
        logger,
        profile
      });
      const isCompatibleRequestHandler = !isH2(requestHandler);
      stsClient = new STSClient2({
        ...stsOptions,
        userAgentAppId,
        profile,
        credentialDefaultProvider: () => async () => closureSourceCreds,
        region: resolvedRegion,
        requestHandler: isCompatibleRequestHandler ? requestHandler : void 0,
        logger
      });
    }
    const { Credentials: Credentials2, AssumedRoleUser: AssumedRoleUser2 } = await stsClient.send(new AssumeRoleCommand(params));
    if (!Credentials2 || !Credentials2.AccessKeyId || !Credentials2.SecretAccessKey) {
      throw new Error(`Invalid response from STS.assumeRole call with role ${params.RoleArn}`);
    }
    const accountId = getAccountIdFromAssumedRoleUser(AssumedRoleUser2);
    const credentials = {
      accessKeyId: Credentials2.AccessKeyId,
      secretAccessKey: Credentials2.SecretAccessKey,
      sessionToken: Credentials2.SessionToken,
      expiration: Credentials2.Expiration,
      ...Credentials2.CredentialScope && { credentialScope: Credentials2.CredentialScope },
      ...accountId && { accountId }
    };
    main.setCredentialFeature(credentials, "CREDENTIALS_STS_ASSUME_ROLE", "i");
    return credentials;
  };
};
const getDefaultRoleAssumerWithWebIdentity$1 = (stsOptions, STSClient2) => {
  let stsClient;
  return async (params) => {
    var _a2, _b, _c2, _d, _e2;
    if (!stsClient) {
      const { logger = (_a2 = stsOptions == null ? void 0 : stsOptions.parentClientConfig) == null ? void 0 : _a2.logger, profile = (_b = stsOptions == null ? void 0 : stsOptions.parentClientConfig) == null ? void 0 : _b.profile, region, requestHandler = (_c2 = stsOptions == null ? void 0 : stsOptions.parentClientConfig) == null ? void 0 : _c2.requestHandler, credentialProviderLogger, userAgentAppId = (_d = stsOptions == null ? void 0 : stsOptions.parentClientConfig) == null ? void 0 : _d.userAgentAppId } = stsOptions;
      const resolvedRegion = await resolveRegion(region, (_e2 = stsOptions == null ? void 0 : stsOptions.parentClientConfig) == null ? void 0 : _e2.region, credentialProviderLogger, {
        logger,
        profile
      });
      const isCompatibleRequestHandler = !isH2(requestHandler);
      stsClient = new STSClient2({
        ...stsOptions,
        userAgentAppId,
        profile,
        region: resolvedRegion,
        requestHandler: isCompatibleRequestHandler ? requestHandler : void 0,
        logger
      });
    }
    const { Credentials: Credentials2, AssumedRoleUser: AssumedRoleUser2 } = await stsClient.send(new AssumeRoleWithWebIdentityCommand(params));
    if (!Credentials2 || !Credentials2.AccessKeyId || !Credentials2.SecretAccessKey) {
      throw new Error(`Invalid response from STS.assumeRoleWithWebIdentity call with role ${params.RoleArn}`);
    }
    const accountId = getAccountIdFromAssumedRoleUser(AssumedRoleUser2);
    const credentials = {
      accessKeyId: Credentials2.AccessKeyId,
      secretAccessKey: Credentials2.SecretAccessKey,
      sessionToken: Credentials2.SessionToken,
      expiration: Credentials2.Expiration,
      ...Credentials2.CredentialScope && { credentialScope: Credentials2.CredentialScope },
      ...accountId && { accountId }
    };
    if (accountId) {
      main.setCredentialFeature(credentials, "RESOLVED_ACCOUNT_ID", "T");
    }
    main.setCredentialFeature(credentials, "CREDENTIALS_STS_ASSUME_ROLE_WEB_ID", "k");
    return credentials;
  };
};
const isH2 = (requestHandler) => {
  var _a2;
  return ((_a2 = requestHandler == null ? void 0 : requestHandler.metadata) == null ? void 0 : _a2.handlerProtocol) === "h2";
};
const getCustomizableStsClientCtor = (baseCtor, customizations) => {
  if (!customizations)
    return baseCtor;
  else
    return class CustomizableSTSClient extends baseCtor {
      constructor(config) {
        super(config);
        for (const customization of customizations) {
          this.middlewareStack.use(customization);
        }
      }
    };
};
const getDefaultRoleAssumer = (stsOptions = {}, stsPlugins) => getDefaultRoleAssumer$1(stsOptions, getCustomizableStsClientCtor(STSClient, stsPlugins));
const getDefaultRoleAssumerWithWebIdentity = (stsOptions = {}, stsPlugins) => getDefaultRoleAssumerWithWebIdentity$1(stsOptions, getCustomizableStsClientCtor(STSClient, stsPlugins));
exports.$Command = main.Command;
exports.__Client = main.Client;
exports.AssumeRoleCommand = AssumeRoleCommand;
exports.AssumeRoleWithWebIdentityCommand = AssumeRoleWithWebIdentityCommand;
exports.ExpiredTokenException = ExpiredTokenException$1;
exports.IDPCommunicationErrorException = IDPCommunicationErrorException$1;
exports.IDPRejectedClaimException = IDPRejectedClaimException$1;
exports.InvalidIdentityTokenException = InvalidIdentityTokenException$1;
exports.MalformedPolicyDocumentException = MalformedPolicyDocumentException$1;
exports.PackedPolicyTooLargeException = PackedPolicyTooLargeException$1;
exports.RegionDisabledException = RegionDisabledException$1;
exports.STSClient = STSClient;
exports.STSServiceException = STSServiceException$1;
exports.getDefaultRoleAssumer = getDefaultRoleAssumer;
exports.getDefaultRoleAssumerWithWebIdentity = getDefaultRoleAssumerWithWebIdentity;
