"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const main = require("./main-DiyhksbA.js");
const _package = require("./package-upLn0O5Z.js");
const AwsRestJsonProtocol = require("./AwsRestJsonProtocol-QPkt_LNp.js");
const noAuth = require("./noAuth-9irRa4FD.js");
const defaultSigninHttpAuthSchemeParametersProvider = async (config, context, input) => {
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
      name: "signin",
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
const defaultSigninHttpAuthSchemeProvider = (authParameters) => {
  const options = [];
  switch (authParameters.operation) {
    case "CreateOAuth2Token": {
      options.push(createSmithyApiNoAuthHttpAuthOption());
      break;
    }
    default: {
      options.push(createAwsAuthSigv4HttpAuthOption(authParameters));
    }
  }
  return options;
};
const resolveHttpAuthSchemeConfig = (config) => {
  const config_0 = main.resolveAwsSdkSigV4Config(config);
  return Object.assign(config_0, {
    authSchemePreference: main.normalizeProvider(config.authSchemePreference ?? [])
  });
};
const resolveClientEndpointParameters = (options) => {
  return Object.assign(options, {
    useDualstackEndpoint: options.useDualstackEndpoint ?? false,
    useFipsEndpoint: options.useFipsEndpoint ?? false,
    defaultSigningName: "signin"
  });
};
const commonParams = {
  UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
  Endpoint: { type: "builtInParams", name: "endpoint" },
  Region: { type: "builtInParams", name: "region" },
  UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
};
const u = "required", v = "fn", w = "argv", x = "ref";
const a = true, b = "isSet", c = "booleanEquals", d = "error", e = "endpoint", f = "tree", g = "PartitionResult", h = "stringEquals", i = { [u]: true, "default": false, "type": "boolean" }, j = { [u]: false, "type": "string" }, k = { [x]: "Endpoint" }, l = { [v]: c, [w]: [{ [x]: "UseFIPS" }, true] }, m = { [v]: c, [w]: [{ [x]: "UseDualStack" }, true] }, n = {}, o = { [v]: "getAttr", [w]: [{ [x]: g }, "name"] }, p = { [v]: c, [w]: [{ [x]: "UseFIPS" }, false] }, q = { [v]: c, [w]: [{ [x]: "UseDualStack" }, false] }, r = { [v]: "getAttr", [w]: [{ [x]: g }, "supportsFIPS"] }, s = { [v]: c, [w]: [true, { [v]: "getAttr", [w]: [{ [x]: g }, "supportsDualStack"] }] }, t = [{ [x]: "Region" }];
const _data = { parameters: { UseDualStack: i, UseFIPS: i, Endpoint: j, Region: j }, rules: [{ conditions: [{ [v]: b, [w]: [k] }], rules: [{ conditions: [l], error: "Invalid Configuration: FIPS and custom endpoint are not supported", type: d }, { rules: [{ conditions: [m], error: "Invalid Configuration: Dualstack and custom endpoint are not supported", type: d }, { endpoint: { url: k, properties: n, headers: n }, type: e }], type: f }], type: f }, { rules: [{ conditions: [{ [v]: b, [w]: t }], rules: [{ conditions: [{ [v]: "aws.partition", [w]: t, assign: g }], rules: [{ conditions: [{ [v]: h, [w]: [o, "aws"] }, p, q], endpoint: { url: "https://{Region}.signin.aws.amazon.com", properties: n, headers: n }, type: e }, { conditions: [{ [v]: h, [w]: [o, "aws-cn"] }, p, q], endpoint: { url: "https://{Region}.signin.amazonaws.cn", properties: n, headers: n }, type: e }, { conditions: [{ [v]: h, [w]: [o, "aws-us-gov"] }, p, q], endpoint: { url: "https://{Region}.signin.amazonaws-us-gov.com", properties: n, headers: n }, type: e }, { conditions: [l, m], rules: [{ conditions: [{ [v]: c, [w]: [a, r] }, s], rules: [{ endpoint: { url: "https://signin-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: n, headers: n }, type: e }], type: f }, { error: "FIPS and DualStack are enabled, but this partition does not support one or both", type: d }], type: f }, { conditions: [l, q], rules: [{ conditions: [{ [v]: c, [w]: [r, a] }], rules: [{ endpoint: { url: "https://signin-fips.{Region}.{PartitionResult#dnsSuffix}", properties: n, headers: n }, type: e }], type: f }, { error: "FIPS is enabled but this partition does not support FIPS", type: d }], type: f }, { conditions: [p, m], rules: [{ conditions: [s], rules: [{ endpoint: { url: "https://signin.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: n, headers: n }, type: e }], type: f }, { error: "DualStack is enabled but this partition does not support DualStack", type: d }], type: f }, { endpoint: { url: "https://signin.{Region}.{PartitionResult#dnsSuffix}", properties: n, headers: n }, type: e }], type: f }], type: f }, { error: "Invalid Configuration: Missing Region", type: d }], type: f }] };
const ruleSet = _data;
const cache = new main.EndpointCache({
  size: 50,
  params: ["Endpoint", "Region", "UseDualStack", "UseFIPS"]
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
    apiVersion: "2023-01-01",
    base64Decoder: (config == null ? void 0 : config.base64Decoder) ?? main.fromBase64,
    base64Encoder: (config == null ? void 0 : config.base64Encoder) ?? main.toBase64,
    disableHostPrefix: (config == null ? void 0 : config.disableHostPrefix) ?? false,
    endpointProvider: (config == null ? void 0 : config.endpointProvider) ?? defaultEndpointResolver,
    extensions: (config == null ? void 0 : config.extensions) ?? [],
    httpAuthSchemeProvider: (config == null ? void 0 : config.httpAuthSchemeProvider) ?? defaultSigninHttpAuthSchemeProvider,
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
    protocol: (config == null ? void 0 : config.protocol) ?? new AwsRestJsonProtocol.AwsRestJsonProtocol({ defaultNamespace: "com.amazonaws.signin" }),
    serviceId: (config == null ? void 0 : config.serviceId) ?? "Signin",
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
class SigninClient extends main.Client {
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
      httpAuthSchemeParametersProvider: defaultSigninHttpAuthSchemeParametersProvider,
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
let SigninServiceException$1 = class SigninServiceException extends main.ServiceException {
  constructor(options) {
    super(options);
    Object.setPrototypeOf(this, SigninServiceException.prototype);
  }
};
let AccessDeniedException$1 = class AccessDeniedException extends SigninServiceException$1 {
  constructor(opts) {
    super({
      name: "AccessDeniedException",
      $fault: "client",
      ...opts
    });
    __publicField(this, "name", "AccessDeniedException");
    __publicField(this, "$fault", "client");
    __publicField(this, "error");
    Object.setPrototypeOf(this, AccessDeniedException.prototype);
    this.error = opts.error;
  }
};
let InternalServerException$1 = class InternalServerException extends SigninServiceException$1 {
  constructor(opts) {
    super({
      name: "InternalServerException",
      $fault: "server",
      ...opts
    });
    __publicField(this, "name", "InternalServerException");
    __publicField(this, "$fault", "server");
    __publicField(this, "error");
    Object.setPrototypeOf(this, InternalServerException.prototype);
    this.error = opts.error;
  }
};
let TooManyRequestsError$1 = class TooManyRequestsError extends SigninServiceException$1 {
  constructor(opts) {
    super({
      name: "TooManyRequestsError",
      $fault: "client",
      ...opts
    });
    __publicField(this, "name", "TooManyRequestsError");
    __publicField(this, "$fault", "client");
    __publicField(this, "error");
    Object.setPrototypeOf(this, TooManyRequestsError.prototype);
    this.error = opts.error;
  }
};
let ValidationException$1 = class ValidationException extends SigninServiceException$1 {
  constructor(opts) {
    super({
      name: "ValidationException",
      $fault: "client",
      ...opts
    });
    __publicField(this, "name", "ValidationException");
    __publicField(this, "$fault", "client");
    __publicField(this, "error");
    Object.setPrototypeOf(this, ValidationException.prototype);
    this.error = opts.error;
  }
};
const _ADE = "AccessDeniedException";
const _AT = "AccessToken";
const _COAT = "CreateOAuth2Token";
const _COATR = "CreateOAuth2TokenRequest";
const _COATRB = "CreateOAuth2TokenRequestBody";
const _COATRBr = "CreateOAuth2TokenResponseBody";
const _COATRr = "CreateOAuth2TokenResponse";
const _ISE = "InternalServerException";
const _RT = "RefreshToken";
const _TMRE = "TooManyRequestsError";
const _VE = "ValidationException";
const _aKI = "accessKeyId";
const _aT = "accessToken";
const _c = "client";
const _cI = "clientId";
const _cV = "codeVerifier";
const _co = "code";
const _e = "error";
const _eI = "expiresIn";
const _gT = "grantType";
const _h = "http";
const _hE = "httpError";
const _iT = "idToken";
const _jN = "jsonName";
const _m = "message";
const _rT = "refreshToken";
const _rU = "redirectUri";
const _s = "server";
const _sAK = "secretAccessKey";
const _sT = "sessionToken";
const _sm = "smithy.ts.sdk.synthetic.com.amazonaws.signin";
const _tI = "tokenInput";
const _tO = "tokenOutput";
const _tT = "tokenType";
const n0 = "com.amazonaws.signin";
var RefreshToken = [0, n0, _RT, 8, 0];
var AccessDeniedException2 = [
  -3,
  n0,
  _ADE,
  {
    [_e]: _c
  },
  [_e, _m],
  [0, 0]
];
main.TypeRegistry.for(n0).registerError(AccessDeniedException2, AccessDeniedException$1);
var AccessToken = [
  3,
  n0,
  _AT,
  8,
  [_aKI, _sAK, _sT],
  [
    [
      0,
      {
        [_jN]: _aKI
      }
    ],
    [
      0,
      {
        [_jN]: _sAK
      }
    ],
    [
      0,
      {
        [_jN]: _sT
      }
    ]
  ]
];
var CreateOAuth2TokenRequest = [
  3,
  n0,
  _COATR,
  0,
  [_tI],
  [[() => CreateOAuth2TokenRequestBody, 16]]
];
var CreateOAuth2TokenRequestBody = [
  3,
  n0,
  _COATRB,
  0,
  [_cI, _gT, _co, _rU, _cV, _rT],
  [
    [
      0,
      {
        [_jN]: _cI
      }
    ],
    [
      0,
      {
        [_jN]: _gT
      }
    ],
    0,
    [
      0,
      {
        [_jN]: _rU
      }
    ],
    [
      0,
      {
        [_jN]: _cV
      }
    ],
    [
      () => RefreshToken,
      {
        [_jN]: _rT
      }
    ]
  ]
];
var CreateOAuth2TokenResponse = [
  3,
  n0,
  _COATRr,
  0,
  [_tO],
  [[() => CreateOAuth2TokenResponseBody, 16]]
];
var CreateOAuth2TokenResponseBody = [
  3,
  n0,
  _COATRBr,
  0,
  [_aT, _tT, _eI, _rT, _iT],
  [
    [
      () => AccessToken,
      {
        [_jN]: _aT
      }
    ],
    [
      0,
      {
        [_jN]: _tT
      }
    ],
    [
      1,
      {
        [_jN]: _eI
      }
    ],
    [
      () => RefreshToken,
      {
        [_jN]: _rT
      }
    ],
    [
      0,
      {
        [_jN]: _iT
      }
    ]
  ]
];
var InternalServerException2 = [
  -3,
  n0,
  _ISE,
  {
    [_e]: _s,
    [_hE]: 500
  },
  [_e, _m],
  [0, 0]
];
main.TypeRegistry.for(n0).registerError(InternalServerException2, InternalServerException$1);
var TooManyRequestsError2 = [
  -3,
  n0,
  _TMRE,
  {
    [_e]: _c,
    [_hE]: 429
  },
  [_e, _m],
  [0, 0]
];
main.TypeRegistry.for(n0).registerError(TooManyRequestsError2, TooManyRequestsError$1);
var ValidationException2 = [
  -3,
  n0,
  _VE,
  {
    [_e]: _c,
    [_hE]: 400
  },
  [_e, _m],
  [0, 0]
];
main.TypeRegistry.for(n0).registerError(ValidationException2, ValidationException$1);
var SigninServiceException2 = [-3, _sm, "SigninServiceException", 0, [], []];
main.TypeRegistry.for(_sm).registerError(SigninServiceException2, SigninServiceException$1);
var CreateOAuth2Token = [
  9,
  n0,
  _COAT,
  {
    [_h]: ["POST", "/v1/token", 200]
  },
  () => CreateOAuth2TokenRequest,
  () => CreateOAuth2TokenResponse
];
class CreateOAuth2TokenCommand extends main.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o2) {
  return [main.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
}).s("Signin", "CreateOAuth2Token", {}).n("SigninClient", "CreateOAuth2TokenCommand").sc(CreateOAuth2Token).build() {
}
exports.$Command = main.Command;
exports.__Client = main.Client;
exports.AccessDeniedException = AccessDeniedException$1;
exports.CreateOAuth2TokenCommand = CreateOAuth2TokenCommand;
exports.InternalServerException = InternalServerException$1;
exports.SigninClient = SigninClient;
exports.SigninServiceException = SigninServiceException$1;
exports.TooManyRequestsError = TooManyRequestsError$1;
exports.ValidationException = ValidationException$1;
