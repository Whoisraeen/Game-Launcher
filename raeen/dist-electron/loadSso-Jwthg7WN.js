"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const main = require("./main-DiyhksbA.js");
const AwsRestJsonProtocol = require("./AwsRestJsonProtocol-QPkt_LNp.js");
const noAuth = require("./noAuth-9irRa4FD.js");
const defaultSSOHttpAuthSchemeParametersProvider = async (config, context, input) => {
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
      name: "awsssoportal",
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
const defaultSSOHttpAuthSchemeProvider = (authParameters) => {
  const options = [];
  switch (authParameters.operation) {
    case "GetRoleCredentials": {
      options.push(createSmithyApiNoAuthHttpAuthOption());
      break;
    }
    case "ListAccountRoles": {
      options.push(createSmithyApiNoAuthHttpAuthOption());
      break;
    }
    case "ListAccounts": {
      options.push(createSmithyApiNoAuthHttpAuthOption());
      break;
    }
    case "Logout": {
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
    defaultSigningName: "awsssoportal"
  });
};
const commonParams = {
  UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
  Endpoint: { type: "builtInParams", name: "endpoint" },
  Region: { type: "builtInParams", name: "region" },
  UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
};
const version = "3.940.0";
const packageInfo = {
  version
};
const u = "required", v = "fn", w = "argv", x = "ref";
const a = true, b = "isSet", c = "booleanEquals", d = "error", e = "endpoint", f = "tree", g = "PartitionResult", h = "getAttr", i = { [u]: false, "type": "string" }, j = { [u]: true, "default": false, "type": "boolean" }, k = { [x]: "Endpoint" }, l = { [v]: c, [w]: [{ [x]: "UseFIPS" }, true] }, m = { [v]: c, [w]: [{ [x]: "UseDualStack" }, true] }, n = {}, o = { [v]: h, [w]: [{ [x]: g }, "supportsFIPS"] }, p = { [x]: g }, q = { [v]: c, [w]: [true, { [v]: h, [w]: [p, "supportsDualStack"] }] }, r = [l], s = [m], t = [{ [x]: "Region" }];
const _data = { parameters: { Region: i, UseDualStack: j, UseFIPS: j, Endpoint: i }, rules: [{ conditions: [{ [v]: b, [w]: [k] }], rules: [{ conditions: r, error: "Invalid Configuration: FIPS and custom endpoint are not supported", type: d }, { conditions: s, error: "Invalid Configuration: Dualstack and custom endpoint are not supported", type: d }, { endpoint: { url: k, properties: n, headers: n }, type: e }], type: f }, { conditions: [{ [v]: b, [w]: t }], rules: [{ conditions: [{ [v]: "aws.partition", [w]: t, assign: g }], rules: [{ conditions: [l, m], rules: [{ conditions: [{ [v]: c, [w]: [a, o] }, q], rules: [{ endpoint: { url: "https://portal.sso-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: n, headers: n }, type: e }], type: f }, { error: "FIPS and DualStack are enabled, but this partition does not support one or both", type: d }], type: f }, { conditions: r, rules: [{ conditions: [{ [v]: c, [w]: [o, a] }], rules: [{ conditions: [{ [v]: "stringEquals", [w]: [{ [v]: h, [w]: [p, "name"] }, "aws-us-gov"] }], endpoint: { url: "https://portal.sso.{Region}.amazonaws.com", properties: n, headers: n }, type: e }, { endpoint: { url: "https://portal.sso-fips.{Region}.{PartitionResult#dnsSuffix}", properties: n, headers: n }, type: e }], type: f }, { error: "FIPS is enabled but this partition does not support FIPS", type: d }], type: f }, { conditions: s, rules: [{ conditions: [q], rules: [{ endpoint: { url: "https://portal.sso.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: n, headers: n }, type: e }], type: f }, { error: "DualStack is enabled but this partition does not support DualStack", type: d }], type: f }, { endpoint: { url: "https://portal.sso.{Region}.{PartitionResult#dnsSuffix}", properties: n, headers: n }, type: e }], type: f }], type: f }, { error: "Invalid Configuration: Missing Region", type: d }] };
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
    httpAuthSchemeProvider: (config == null ? void 0 : config.httpAuthSchemeProvider) ?? defaultSSOHttpAuthSchemeProvider,
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
    protocol: (config == null ? void 0 : config.protocol) ?? new AwsRestJsonProtocol.AwsRestJsonProtocol({ defaultNamespace: "com.amazonaws.sso" }),
    serviceId: (config == null ? void 0 : config.serviceId) ?? "SSO",
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
    defaultUserAgentProvider: (config == null ? void 0 : config.defaultUserAgentProvider) ?? main.createDefaultUserAgentProvider({ serviceId: clientSharedValues.serviceId, clientVersion: packageInfo.version }),
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
class SSOClient extends main.Client {
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
      httpAuthSchemeParametersProvider: defaultSSOHttpAuthSchemeParametersProvider,
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
let SSOServiceException$1 = class SSOServiceException extends main.ServiceException {
  constructor(options) {
    super(options);
    Object.setPrototypeOf(this, SSOServiceException.prototype);
  }
};
let InvalidRequestException$1 = class InvalidRequestException extends SSOServiceException$1 {
  constructor(opts) {
    super({
      name: "InvalidRequestException",
      $fault: "client",
      ...opts
    });
    __publicField(this, "name", "InvalidRequestException");
    __publicField(this, "$fault", "client");
    Object.setPrototypeOf(this, InvalidRequestException.prototype);
  }
};
let ResourceNotFoundException$1 = class ResourceNotFoundException extends SSOServiceException$1 {
  constructor(opts) {
    super({
      name: "ResourceNotFoundException",
      $fault: "client",
      ...opts
    });
    __publicField(this, "name", "ResourceNotFoundException");
    __publicField(this, "$fault", "client");
    Object.setPrototypeOf(this, ResourceNotFoundException.prototype);
  }
};
let TooManyRequestsException$1 = class TooManyRequestsException extends SSOServiceException$1 {
  constructor(opts) {
    super({
      name: "TooManyRequestsException",
      $fault: "client",
      ...opts
    });
    __publicField(this, "name", "TooManyRequestsException");
    __publicField(this, "$fault", "client");
    Object.setPrototypeOf(this, TooManyRequestsException.prototype);
  }
};
let UnauthorizedException$1 = class UnauthorizedException extends SSOServiceException$1 {
  constructor(opts) {
    super({
      name: "UnauthorizedException",
      $fault: "client",
      ...opts
    });
    __publicField(this, "name", "UnauthorizedException");
    __publicField(this, "$fault", "client");
    Object.setPrototypeOf(this, UnauthorizedException.prototype);
  }
};
const _ATT = "AccessTokenType";
const _GRC = "GetRoleCredentials";
const _GRCR = "GetRoleCredentialsRequest";
const _GRCRe = "GetRoleCredentialsResponse";
const _IRE = "InvalidRequestException";
const _RC = "RoleCredentials";
const _RNFE = "ResourceNotFoundException";
const _SAKT = "SecretAccessKeyType";
const _STT = "SessionTokenType";
const _TMRE = "TooManyRequestsException";
const _UE = "UnauthorizedException";
const _aI = "accountId";
const _aKI = "accessKeyId";
const _aT = "accessToken";
const _ai = "account_id";
const _c = "client";
const _e = "error";
const _ex = "expiration";
const _h = "http";
const _hE = "httpError";
const _hH = "httpHeader";
const _hQ = "httpQuery";
const _m = "message";
const _rC = "roleCredentials";
const _rN = "roleName";
const _rn = "role_name";
const _s = "smithy.ts.sdk.synthetic.com.amazonaws.sso";
const _sAK = "secretAccessKey";
const _sT = "sessionToken";
const _xasbt = "x-amz-sso_bearer_token";
const n0 = "com.amazonaws.sso";
var AccessTokenType = [0, n0, _ATT, 8, 0];
var SecretAccessKeyType = [0, n0, _SAKT, 8, 0];
var SessionTokenType = [0, n0, _STT, 8, 0];
var GetRoleCredentialsRequest = [
  3,
  n0,
  _GRCR,
  0,
  [_rN, _aI, _aT],
  [
    [
      0,
      {
        [_hQ]: _rn
      }
    ],
    [
      0,
      {
        [_hQ]: _ai
      }
    ],
    [
      () => AccessTokenType,
      {
        [_hH]: _xasbt
      }
    ]
  ]
];
var GetRoleCredentialsResponse = [3, n0, _GRCRe, 0, [_rC], [[() => RoleCredentials, 0]]];
var InvalidRequestException2 = [
  -3,
  n0,
  _IRE,
  {
    [_e]: _c,
    [_hE]: 400
  },
  [_m],
  [0]
];
main.TypeRegistry.for(n0).registerError(InvalidRequestException2, InvalidRequestException$1);
var ResourceNotFoundException2 = [
  -3,
  n0,
  _RNFE,
  {
    [_e]: _c,
    [_hE]: 404
  },
  [_m],
  [0]
];
main.TypeRegistry.for(n0).registerError(ResourceNotFoundException2, ResourceNotFoundException$1);
var RoleCredentials = [
  3,
  n0,
  _RC,
  0,
  [_aKI, _sAK, _sT, _ex],
  [0, [() => SecretAccessKeyType, 0], [() => SessionTokenType, 0], 1]
];
var TooManyRequestsException2 = [
  -3,
  n0,
  _TMRE,
  {
    [_e]: _c,
    [_hE]: 429
  },
  [_m],
  [0]
];
main.TypeRegistry.for(n0).registerError(TooManyRequestsException2, TooManyRequestsException$1);
var UnauthorizedException2 = [
  -3,
  n0,
  _UE,
  {
    [_e]: _c,
    [_hE]: 401
  },
  [_m],
  [0]
];
main.TypeRegistry.for(n0).registerError(UnauthorizedException2, UnauthorizedException$1);
var SSOServiceException2 = [-3, _s, "SSOServiceException", 0, [], []];
main.TypeRegistry.for(_s).registerError(SSOServiceException2, SSOServiceException$1);
var GetRoleCredentials = [
  9,
  n0,
  _GRC,
  {
    [_h]: ["GET", "/federation/credentials", 200]
  },
  () => GetRoleCredentialsRequest,
  () => GetRoleCredentialsResponse
];
class GetRoleCredentialsCommand extends main.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o2) {
  return [main.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
}).s("SWBPortalService", "GetRoleCredentials", {}).n("SSOClient", "GetRoleCredentialsCommand").sc(GetRoleCredentials).build() {
}
exports.GetRoleCredentialsCommand = GetRoleCredentialsCommand;
exports.SSOClient = SSOClient;
