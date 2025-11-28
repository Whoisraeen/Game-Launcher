"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const main = require("./main-0EimHS6-.js");
const _package = require("./package-upLn0O5Z.js");
const AwsRestJsonProtocol = require("./AwsRestJsonProtocol-DNP-IFaY.js");
const noAuth = require("./noAuth-9irRa4FD.js");
const defaultSSOOIDCHttpAuthSchemeParametersProvider = async (config, context, input) => {
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
      name: "sso-oauth",
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
const defaultSSOOIDCHttpAuthSchemeProvider = (authParameters) => {
  const options = [];
  switch (authParameters.operation) {
    case "CreateToken": {
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
    defaultSigningName: "sso-oauth"
  });
};
const commonParams = {
  UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
  Endpoint: { type: "builtInParams", name: "endpoint" },
  Region: { type: "builtInParams", name: "region" },
  UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
};
const u = "required", v = "fn", w = "argv", x = "ref";
const a = true, b = "isSet", c = "booleanEquals", d = "error", e = "endpoint", f = "tree", g = "PartitionResult", h = "getAttr", i = { [u]: false, "type": "string" }, j = { [u]: true, "default": false, "type": "boolean" }, k = { [x]: "Endpoint" }, l = { [v]: c, [w]: [{ [x]: "UseFIPS" }, true] }, m = { [v]: c, [w]: [{ [x]: "UseDualStack" }, true] }, n = {}, o = { [v]: h, [w]: [{ [x]: g }, "supportsFIPS"] }, p = { [x]: g }, q = { [v]: c, [w]: [true, { [v]: h, [w]: [p, "supportsDualStack"] }] }, r = [l], s = [m], t = [{ [x]: "Region" }];
const _data = { parameters: { Region: i, UseDualStack: j, UseFIPS: j, Endpoint: i }, rules: [{ conditions: [{ [v]: b, [w]: [k] }], rules: [{ conditions: r, error: "Invalid Configuration: FIPS and custom endpoint are not supported", type: d }, { conditions: s, error: "Invalid Configuration: Dualstack and custom endpoint are not supported", type: d }, { endpoint: { url: k, properties: n, headers: n }, type: e }], type: f }, { conditions: [{ [v]: b, [w]: t }], rules: [{ conditions: [{ [v]: "aws.partition", [w]: t, assign: g }], rules: [{ conditions: [l, m], rules: [{ conditions: [{ [v]: c, [w]: [a, o] }, q], rules: [{ endpoint: { url: "https://oidc-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: n, headers: n }, type: e }], type: f }, { error: "FIPS and DualStack are enabled, but this partition does not support one or both", type: d }], type: f }, { conditions: r, rules: [{ conditions: [{ [v]: c, [w]: [o, a] }], rules: [{ conditions: [{ [v]: "stringEquals", [w]: [{ [v]: h, [w]: [p, "name"] }, "aws-us-gov"] }], endpoint: { url: "https://oidc.{Region}.amazonaws.com", properties: n, headers: n }, type: e }, { endpoint: { url: "https://oidc-fips.{Region}.{PartitionResult#dnsSuffix}", properties: n, headers: n }, type: e }], type: f }, { error: "FIPS is enabled but this partition does not support FIPS", type: d }], type: f }, { conditions: s, rules: [{ conditions: [q], rules: [{ endpoint: { url: "https://oidc.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: n, headers: n }, type: e }], type: f }, { error: "DualStack is enabled but this partition does not support DualStack", type: d }], type: f }, { endpoint: { url: "https://oidc.{Region}.{PartitionResult#dnsSuffix}", properties: n, headers: n }, type: e }], type: f }], type: f }, { error: "Invalid Configuration: Missing Region", type: d }] };
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
    apiVersion: "2019-06-10",
    base64Decoder: (config == null ? void 0 : config.base64Decoder) ?? main.fromBase64,
    base64Encoder: (config == null ? void 0 : config.base64Encoder) ?? main.toBase64,
    disableHostPrefix: (config == null ? void 0 : config.disableHostPrefix) ?? false,
    endpointProvider: (config == null ? void 0 : config.endpointProvider) ?? defaultEndpointResolver,
    extensions: (config == null ? void 0 : config.extensions) ?? [],
    httpAuthSchemeProvider: (config == null ? void 0 : config.httpAuthSchemeProvider) ?? defaultSSOOIDCHttpAuthSchemeProvider,
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
    protocol: (config == null ? void 0 : config.protocol) ?? new AwsRestJsonProtocol.AwsRestJsonProtocol({ defaultNamespace: "com.amazonaws.ssooidc" }),
    serviceId: (config == null ? void 0 : config.serviceId) ?? "SSO OIDC",
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
class SSOOIDCClient extends main.Client {
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
      httpAuthSchemeParametersProvider: defaultSSOOIDCHttpAuthSchemeParametersProvider,
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
let SSOOIDCServiceException$1 = class SSOOIDCServiceException extends main.ServiceException {
  constructor(options) {
    super(options);
    Object.setPrototypeOf(this, SSOOIDCServiceException.prototype);
  }
};
let AccessDeniedException$1 = class AccessDeniedException extends SSOOIDCServiceException$1 {
  constructor(opts) {
    super({
      name: "AccessDeniedException",
      $fault: "client",
      ...opts
    });
    __publicField(this, "name", "AccessDeniedException");
    __publicField(this, "$fault", "client");
    __publicField(this, "error");
    __publicField(this, "reason");
    __publicField(this, "error_description");
    Object.setPrototypeOf(this, AccessDeniedException.prototype);
    this.error = opts.error;
    this.reason = opts.reason;
    this.error_description = opts.error_description;
  }
};
let AuthorizationPendingException$1 = class AuthorizationPendingException extends SSOOIDCServiceException$1 {
  constructor(opts) {
    super({
      name: "AuthorizationPendingException",
      $fault: "client",
      ...opts
    });
    __publicField(this, "name", "AuthorizationPendingException");
    __publicField(this, "$fault", "client");
    __publicField(this, "error");
    __publicField(this, "error_description");
    Object.setPrototypeOf(this, AuthorizationPendingException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
let ExpiredTokenException$1 = class ExpiredTokenException extends SSOOIDCServiceException$1 {
  constructor(opts) {
    super({
      name: "ExpiredTokenException",
      $fault: "client",
      ...opts
    });
    __publicField(this, "name", "ExpiredTokenException");
    __publicField(this, "$fault", "client");
    __publicField(this, "error");
    __publicField(this, "error_description");
    Object.setPrototypeOf(this, ExpiredTokenException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
let InternalServerException$1 = class InternalServerException extends SSOOIDCServiceException$1 {
  constructor(opts) {
    super({
      name: "InternalServerException",
      $fault: "server",
      ...opts
    });
    __publicField(this, "name", "InternalServerException");
    __publicField(this, "$fault", "server");
    __publicField(this, "error");
    __publicField(this, "error_description");
    Object.setPrototypeOf(this, InternalServerException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
let InvalidClientException$1 = class InvalidClientException extends SSOOIDCServiceException$1 {
  constructor(opts) {
    super({
      name: "InvalidClientException",
      $fault: "client",
      ...opts
    });
    __publicField(this, "name", "InvalidClientException");
    __publicField(this, "$fault", "client");
    __publicField(this, "error");
    __publicField(this, "error_description");
    Object.setPrototypeOf(this, InvalidClientException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
let InvalidGrantException$1 = class InvalidGrantException extends SSOOIDCServiceException$1 {
  constructor(opts) {
    super({
      name: "InvalidGrantException",
      $fault: "client",
      ...opts
    });
    __publicField(this, "name", "InvalidGrantException");
    __publicField(this, "$fault", "client");
    __publicField(this, "error");
    __publicField(this, "error_description");
    Object.setPrototypeOf(this, InvalidGrantException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
let InvalidRequestException$1 = class InvalidRequestException extends SSOOIDCServiceException$1 {
  constructor(opts) {
    super({
      name: "InvalidRequestException",
      $fault: "client",
      ...opts
    });
    __publicField(this, "name", "InvalidRequestException");
    __publicField(this, "$fault", "client");
    __publicField(this, "error");
    __publicField(this, "reason");
    __publicField(this, "error_description");
    Object.setPrototypeOf(this, InvalidRequestException.prototype);
    this.error = opts.error;
    this.reason = opts.reason;
    this.error_description = opts.error_description;
  }
};
let InvalidScopeException$1 = class InvalidScopeException extends SSOOIDCServiceException$1 {
  constructor(opts) {
    super({
      name: "InvalidScopeException",
      $fault: "client",
      ...opts
    });
    __publicField(this, "name", "InvalidScopeException");
    __publicField(this, "$fault", "client");
    __publicField(this, "error");
    __publicField(this, "error_description");
    Object.setPrototypeOf(this, InvalidScopeException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
let SlowDownException$1 = class SlowDownException extends SSOOIDCServiceException$1 {
  constructor(opts) {
    super({
      name: "SlowDownException",
      $fault: "client",
      ...opts
    });
    __publicField(this, "name", "SlowDownException");
    __publicField(this, "$fault", "client");
    __publicField(this, "error");
    __publicField(this, "error_description");
    Object.setPrototypeOf(this, SlowDownException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
let UnauthorizedClientException$1 = class UnauthorizedClientException extends SSOOIDCServiceException$1 {
  constructor(opts) {
    super({
      name: "UnauthorizedClientException",
      $fault: "client",
      ...opts
    });
    __publicField(this, "name", "UnauthorizedClientException");
    __publicField(this, "$fault", "client");
    __publicField(this, "error");
    __publicField(this, "error_description");
    Object.setPrototypeOf(this, UnauthorizedClientException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
let UnsupportedGrantTypeException$1 = class UnsupportedGrantTypeException extends SSOOIDCServiceException$1 {
  constructor(opts) {
    super({
      name: "UnsupportedGrantTypeException",
      $fault: "client",
      ...opts
    });
    __publicField(this, "name", "UnsupportedGrantTypeException");
    __publicField(this, "$fault", "client");
    __publicField(this, "error");
    __publicField(this, "error_description");
    Object.setPrototypeOf(this, UnsupportedGrantTypeException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
const _ADE = "AccessDeniedException";
const _APE = "AuthorizationPendingException";
const _AT = "AccessToken";
const _CS = "ClientSecret";
const _CT = "CreateToken";
const _CTR = "CreateTokenRequest";
const _CTRr = "CreateTokenResponse";
const _CV = "CodeVerifier";
const _ETE = "ExpiredTokenException";
const _ICE = "InvalidClientException";
const _IGE = "InvalidGrantException";
const _IRE = "InvalidRequestException";
const _ISE = "InternalServerException";
const _ISEn = "InvalidScopeException";
const _IT = "IdToken";
const _RT = "RefreshToken";
const _SDE = "SlowDownException";
const _UCE = "UnauthorizedClientException";
const _UGTE = "UnsupportedGrantTypeException";
const _aT = "accessToken";
const _c = "client";
const _cI = "clientId";
const _cS = "clientSecret";
const _cV = "codeVerifier";
const _co = "code";
const _dC = "deviceCode";
const _e = "error";
const _eI = "expiresIn";
const _ed = "error_description";
const _gT = "grantType";
const _h = "http";
const _hE = "httpError";
const _iT = "idToken";
const _r = "reason";
const _rT = "refreshToken";
const _rU = "redirectUri";
const _s = "scope";
const _se = "server";
const _sm = "smithy.ts.sdk.synthetic.com.amazonaws.ssooidc";
const _tT = "tokenType";
const n0 = "com.amazonaws.ssooidc";
var AccessToken = [0, n0, _AT, 8, 0];
var ClientSecret = [0, n0, _CS, 8, 0];
var CodeVerifier = [0, n0, _CV, 8, 0];
var IdToken = [0, n0, _IT, 8, 0];
var RefreshToken = [0, n0, _RT, 8, 0];
var AccessDeniedException2 = [
  -3,
  n0,
  _ADE,
  {
    [_e]: _c,
    [_hE]: 400
  },
  [_e, _r, _ed],
  [0, 0, 0]
];
main.TypeRegistry.for(n0).registerError(AccessDeniedException2, AccessDeniedException$1);
var AuthorizationPendingException2 = [
  -3,
  n0,
  _APE,
  {
    [_e]: _c,
    [_hE]: 400
  },
  [_e, _ed],
  [0, 0]
];
main.TypeRegistry.for(n0).registerError(AuthorizationPendingException2, AuthorizationPendingException$1);
var CreateTokenRequest = [
  3,
  n0,
  _CTR,
  0,
  [_cI, _cS, _gT, _dC, _co, _rT, _s, _rU, _cV],
  [0, [() => ClientSecret, 0], 0, 0, 0, [() => RefreshToken, 0], 64 | 0, 0, [() => CodeVerifier, 0]]
];
var CreateTokenResponse = [
  3,
  n0,
  _CTRr,
  0,
  [_aT, _tT, _eI, _rT, _iT],
  [[() => AccessToken, 0], 0, 1, [() => RefreshToken, 0], [() => IdToken, 0]]
];
var ExpiredTokenException2 = [
  -3,
  n0,
  _ETE,
  {
    [_e]: _c,
    [_hE]: 400
  },
  [_e, _ed],
  [0, 0]
];
main.TypeRegistry.for(n0).registerError(ExpiredTokenException2, ExpiredTokenException$1);
var InternalServerException2 = [
  -3,
  n0,
  _ISE,
  {
    [_e]: _se,
    [_hE]: 500
  },
  [_e, _ed],
  [0, 0]
];
main.TypeRegistry.for(n0).registerError(InternalServerException2, InternalServerException$1);
var InvalidClientException2 = [
  -3,
  n0,
  _ICE,
  {
    [_e]: _c,
    [_hE]: 401
  },
  [_e, _ed],
  [0, 0]
];
main.TypeRegistry.for(n0).registerError(InvalidClientException2, InvalidClientException$1);
var InvalidGrantException2 = [
  -3,
  n0,
  _IGE,
  {
    [_e]: _c,
    [_hE]: 400
  },
  [_e, _ed],
  [0, 0]
];
main.TypeRegistry.for(n0).registerError(InvalidGrantException2, InvalidGrantException$1);
var InvalidRequestException2 = [
  -3,
  n0,
  _IRE,
  {
    [_e]: _c,
    [_hE]: 400
  },
  [_e, _r, _ed],
  [0, 0, 0]
];
main.TypeRegistry.for(n0).registerError(InvalidRequestException2, InvalidRequestException$1);
var InvalidScopeException2 = [
  -3,
  n0,
  _ISEn,
  {
    [_e]: _c,
    [_hE]: 400
  },
  [_e, _ed],
  [0, 0]
];
main.TypeRegistry.for(n0).registerError(InvalidScopeException2, InvalidScopeException$1);
var SlowDownException2 = [
  -3,
  n0,
  _SDE,
  {
    [_e]: _c,
    [_hE]: 400
  },
  [_e, _ed],
  [0, 0]
];
main.TypeRegistry.for(n0).registerError(SlowDownException2, SlowDownException$1);
var UnauthorizedClientException2 = [
  -3,
  n0,
  _UCE,
  {
    [_e]: _c,
    [_hE]: 400
  },
  [_e, _ed],
  [0, 0]
];
main.TypeRegistry.for(n0).registerError(UnauthorizedClientException2, UnauthorizedClientException$1);
var UnsupportedGrantTypeException2 = [
  -3,
  n0,
  _UGTE,
  {
    [_e]: _c,
    [_hE]: 400
  },
  [_e, _ed],
  [0, 0]
];
main.TypeRegistry.for(n0).registerError(UnsupportedGrantTypeException2, UnsupportedGrantTypeException$1);
var SSOOIDCServiceException2 = [-3, _sm, "SSOOIDCServiceException", 0, [], []];
main.TypeRegistry.for(_sm).registerError(SSOOIDCServiceException2, SSOOIDCServiceException$1);
var CreateToken = [
  9,
  n0,
  _CT,
  {
    [_h]: ["POST", "/token", 200]
  },
  () => CreateTokenRequest,
  () => CreateTokenResponse
];
class CreateTokenCommand extends main.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o2) {
  return [main.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
}).s("AWSSSOOIDCService", "CreateToken", {}).n("SSOOIDCClient", "CreateTokenCommand").sc(CreateToken).build() {
}
exports.$Command = main.Command;
exports.__Client = main.Client;
exports.AccessDeniedException = AccessDeniedException$1;
exports.AuthorizationPendingException = AuthorizationPendingException$1;
exports.CreateTokenCommand = CreateTokenCommand;
exports.ExpiredTokenException = ExpiredTokenException$1;
exports.InternalServerException = InternalServerException$1;
exports.InvalidClientException = InvalidClientException$1;
exports.InvalidGrantException = InvalidGrantException$1;
exports.InvalidRequestException = InvalidRequestException$1;
exports.InvalidScopeException = InvalidScopeException$1;
exports.SSOOIDCClient = SSOOIDCClient;
exports.SSOOIDCServiceException = SSOOIDCServiceException$1;
exports.SlowDownException = SlowDownException$1;
exports.UnauthorizedClientException = UnauthorizedClientException$1;
exports.UnsupportedGrantTypeException = UnsupportedGrantTypeException$1;
