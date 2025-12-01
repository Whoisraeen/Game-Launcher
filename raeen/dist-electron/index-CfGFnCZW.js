"use strict";
const index$1 = require("./index-DrxcJaDU.js");
const main = require("./main-BIF8JQzB.js");
function _mergeNamespaces(n, m) {
  for (var i = 0; i < m.length; i++) {
    const e = m[i];
    if (typeof e !== "string" && !Array.isArray(e)) {
      for (const k in e) {
        if (k !== "default" && !(k in n)) {
          const d = Object.getOwnPropertyDescriptor(e, k);
          if (d) {
            Object.defineProperty(n, k, d.get ? d : {
              enumerable: true,
              get: () => e[k]
            });
          }
        }
      }
    }
  }
  return Object.freeze(Object.defineProperty(n, Symbol.toStringTag, { value: "Module" }));
}
var ssoOidc = {};
var httpAuthSchemeProvider = {};
var hasRequiredHttpAuthSchemeProvider;
function requireHttpAuthSchemeProvider() {
  if (hasRequiredHttpAuthSchemeProvider) return httpAuthSchemeProvider;
  hasRequiredHttpAuthSchemeProvider = 1;
  Object.defineProperty(httpAuthSchemeProvider, "__esModule", { value: true });
  httpAuthSchemeProvider.resolveHttpAuthSchemeConfig = httpAuthSchemeProvider.defaultSSOOIDCHttpAuthSchemeProvider = httpAuthSchemeProvider.defaultSSOOIDCHttpAuthSchemeParametersProvider = void 0;
  const core_1 = main.requireDistCjs();
  const util_middleware_1 = main.require$$1;
  const defaultSSOOIDCHttpAuthSchemeParametersProvider = async (config, context, input) => {
    return {
      operation: (0, util_middleware_1.getSmithyContext)(context).operation,
      region: await (0, util_middleware_1.normalizeProvider)(config.region)() || (() => {
        throw new Error("expected `region` to be configured for `aws.auth#sigv4`");
      })()
    };
  };
  httpAuthSchemeProvider.defaultSSOOIDCHttpAuthSchemeParametersProvider = defaultSSOOIDCHttpAuthSchemeParametersProvider;
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
  httpAuthSchemeProvider.defaultSSOOIDCHttpAuthSchemeProvider = defaultSSOOIDCHttpAuthSchemeProvider;
  const resolveHttpAuthSchemeConfig = (config) => {
    const config_0 = (0, core_1.resolveAwsSdkSigV4Config)(config);
    return Object.assign(config_0, {
      authSchemePreference: (0, util_middleware_1.normalizeProvider)(config.authSchemePreference ?? [])
    });
  };
  httpAuthSchemeProvider.resolveHttpAuthSchemeConfig = resolveHttpAuthSchemeConfig;
  return httpAuthSchemeProvider;
}
var runtimeConfig = {};
var runtimeConfig_shared = {};
var endpointResolver = {};
var ruleset = {};
var hasRequiredRuleset;
function requireRuleset() {
  if (hasRequiredRuleset) return ruleset;
  hasRequiredRuleset = 1;
  Object.defineProperty(ruleset, "__esModule", { value: true });
  ruleset.ruleSet = void 0;
  const u = "required", v = "fn", w = "argv", x = "ref";
  const a = true, b = "isSet", c = "booleanEquals", d = "error", e = "endpoint", f = "tree", g = "PartitionResult", h = "getAttr", i = { [u]: false, "type": "string" }, j = { [u]: true, "default": false, "type": "boolean" }, k = { [x]: "Endpoint" }, l = { [v]: c, [w]: [{ [x]: "UseFIPS" }, true] }, m = { [v]: c, [w]: [{ [x]: "UseDualStack" }, true] }, n = {}, o = { [v]: h, [w]: [{ [x]: g }, "supportsFIPS"] }, p = { [x]: g }, q = { [v]: c, [w]: [true, { [v]: h, [w]: [p, "supportsDualStack"] }] }, r = [l], s = [m], t = [{ [x]: "Region" }];
  const _data = { version: "1.0", parameters: { Region: i, UseDualStack: j, UseFIPS: j, Endpoint: i }, rules: [{ conditions: [{ [v]: b, [w]: [k] }], rules: [{ conditions: r, error: "Invalid Configuration: FIPS and custom endpoint are not supported", type: d }, { conditions: s, error: "Invalid Configuration: Dualstack and custom endpoint are not supported", type: d }, { endpoint: { url: k, properties: n, headers: n }, type: e }], type: f }, { conditions: [{ [v]: b, [w]: t }], rules: [{ conditions: [{ [v]: "aws.partition", [w]: t, assign: g }], rules: [{ conditions: [l, m], rules: [{ conditions: [{ [v]: c, [w]: [a, o] }, q], rules: [{ endpoint: { url: "https://oidc-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: n, headers: n }, type: e }], type: f }, { error: "FIPS and DualStack are enabled, but this partition does not support one or both", type: d }], type: f }, { conditions: r, rules: [{ conditions: [{ [v]: c, [w]: [o, a] }], rules: [{ conditions: [{ [v]: "stringEquals", [w]: [{ [v]: h, [w]: [p, "name"] }, "aws-us-gov"] }], endpoint: { url: "https://oidc.{Region}.amazonaws.com", properties: n, headers: n }, type: e }, { endpoint: { url: "https://oidc-fips.{Region}.{PartitionResult#dnsSuffix}", properties: n, headers: n }, type: e }], type: f }, { error: "FIPS is enabled but this partition does not support FIPS", type: d }], type: f }, { conditions: s, rules: [{ conditions: [q], rules: [{ endpoint: { url: "https://oidc.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: n, headers: n }, type: e }], type: f }, { error: "DualStack is enabled but this partition does not support DualStack", type: d }], type: f }, { endpoint: { url: "https://oidc.{Region}.{PartitionResult#dnsSuffix}", properties: n, headers: n }, type: e }], type: f }], type: f }, { error: "Invalid Configuration: Missing Region", type: d }] };
  ruleset.ruleSet = _data;
  return ruleset;
}
var hasRequiredEndpointResolver;
function requireEndpointResolver() {
  if (hasRequiredEndpointResolver) return endpointResolver;
  hasRequiredEndpointResolver = 1;
  Object.defineProperty(endpointResolver, "__esModule", { value: true });
  endpointResolver.defaultEndpointResolver = void 0;
  const util_endpoints_1 = index$1.require$$0;
  const util_endpoints_2 = index$1.require$$1;
  const ruleset_1 = /* @__PURE__ */ requireRuleset();
  const cache = new util_endpoints_2.EndpointCache({
    size: 50,
    params: ["Endpoint", "Region", "UseDualStack", "UseFIPS"]
  });
  const defaultEndpointResolver = (endpointParams, context = {}) => {
    return cache.get(endpointParams, () => (0, util_endpoints_2.resolveEndpoint)(ruleset_1.ruleSet, {
      endpointParams,
      logger: context.logger
    }));
  };
  endpointResolver.defaultEndpointResolver = defaultEndpointResolver;
  util_endpoints_2.customEndpointFunctions.aws = util_endpoints_1.awsEndpointFunctions;
  return endpointResolver;
}
var hasRequiredRuntimeConfig_shared;
function requireRuntimeConfig_shared() {
  if (hasRequiredRuntimeConfig_shared) return runtimeConfig_shared;
  hasRequiredRuntimeConfig_shared = 1;
  Object.defineProperty(runtimeConfig_shared, "__esModule", { value: true });
  runtimeConfig_shared.getRuntimeConfig = void 0;
  const core_1 = main.requireDistCjs();
  const protocols_1 = main.requireProtocols();
  const core_2 = main.requireDistCjs$1();
  const smithy_client_1 = main.require$$10;
  const url_parser_1 = index$1.require$$4;
  const util_base64_1 = main.require$$5;
  const util_utf8_1 = main.require$$6;
  const httpAuthSchemeProvider_1 = /* @__PURE__ */ requireHttpAuthSchemeProvider();
  const endpointResolver_1 = /* @__PURE__ */ requireEndpointResolver();
  const getRuntimeConfig = (config) => {
    return {
      apiVersion: "2019-06-10",
      base64Decoder: config?.base64Decoder ?? util_base64_1.fromBase64,
      base64Encoder: config?.base64Encoder ?? util_base64_1.toBase64,
      disableHostPrefix: config?.disableHostPrefix ?? false,
      endpointProvider: config?.endpointProvider ?? endpointResolver_1.defaultEndpointResolver,
      extensions: config?.extensions ?? [],
      httpAuthSchemeProvider: config?.httpAuthSchemeProvider ?? httpAuthSchemeProvider_1.defaultSSOOIDCHttpAuthSchemeProvider,
      httpAuthSchemes: config?.httpAuthSchemes ?? [
        {
          schemeId: "aws.auth#sigv4",
          identityProvider: (ipc) => ipc.getIdentityProvider("aws.auth#sigv4"),
          signer: new core_1.AwsSdkSigV4Signer()
        },
        {
          schemeId: "smithy.api#noAuth",
          identityProvider: (ipc) => ipc.getIdentityProvider("smithy.api#noAuth") || (async () => ({})),
          signer: new core_2.NoAuthSigner()
        }
      ],
      logger: config?.logger ?? new smithy_client_1.NoOpLogger(),
      protocol: config?.protocol ?? new protocols_1.AwsRestJsonProtocol({ defaultNamespace: "com.amazonaws.ssooidc" }),
      serviceId: config?.serviceId ?? "SSO OIDC",
      urlParser: config?.urlParser ?? url_parser_1.parseUrl,
      utf8Decoder: config?.utf8Decoder ?? util_utf8_1.fromUtf8,
      utf8Encoder: config?.utf8Encoder ?? util_utf8_1.toUtf8
    };
  };
  runtimeConfig_shared.getRuntimeConfig = getRuntimeConfig;
  return runtimeConfig_shared;
}
var hasRequiredRuntimeConfig;
function requireRuntimeConfig() {
  if (hasRequiredRuntimeConfig) return runtimeConfig;
  hasRequiredRuntimeConfig = 1;
  Object.defineProperty(runtimeConfig, "__esModule", { value: true });
  runtimeConfig.getRuntimeConfig = void 0;
  const tslib_1 = /* @__PURE__ */ main.requireTslib();
  const package_json_1 = tslib_1.__importDefault(index$1.require$$1$1);
  const core_1 = main.requireDistCjs();
  const util_user_agent_node_1 = index$1.require$$3;
  const config_resolver_1 = index$1.require$$4$1;
  const hash_node_1 = index$1.require$$5;
  const middleware_retry_1 = index$1.require$$9$1;
  const node_config_provider_1 = index$1.require$$7;
  const node_http_handler_1 = index$1.require$$8;
  const util_body_length_node_1 = index$1.require$$9;
  const util_retry_1 = index$1.require$$10;
  const runtimeConfig_shared_1 = /* @__PURE__ */ requireRuntimeConfig_shared();
  const smithy_client_1 = main.require$$10;
  const util_defaults_mode_node_1 = index$1.require$$13;
  const smithy_client_2 = main.require$$10;
  const getRuntimeConfig = (config) => {
    (0, smithy_client_2.emitWarningIfUnsupportedVersion)(process.version);
    const defaultsMode = (0, util_defaults_mode_node_1.resolveDefaultsModeConfig)(config);
    const defaultConfigProvider = () => defaultsMode().then(smithy_client_1.loadConfigsForDefaultMode);
    const clientSharedValues = (0, runtimeConfig_shared_1.getRuntimeConfig)(config);
    (0, core_1.emitWarningIfUnsupportedVersion)(process.version);
    const loaderConfig = {
      profile: config?.profile,
      logger: clientSharedValues.logger
    };
    return {
      ...clientSharedValues,
      ...config,
      runtime: "node",
      defaultsMode,
      authSchemePreference: config?.authSchemePreference ?? (0, node_config_provider_1.loadConfig)(core_1.NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, loaderConfig),
      bodyLengthChecker: config?.bodyLengthChecker ?? util_body_length_node_1.calculateBodyLength,
      defaultUserAgentProvider: config?.defaultUserAgentProvider ?? (0, util_user_agent_node_1.createDefaultUserAgentProvider)({ serviceId: clientSharedValues.serviceId, clientVersion: package_json_1.default.version }),
      maxAttempts: config?.maxAttempts ?? (0, node_config_provider_1.loadConfig)(middleware_retry_1.NODE_MAX_ATTEMPT_CONFIG_OPTIONS, config),
      region: config?.region ?? (0, node_config_provider_1.loadConfig)(config_resolver_1.NODE_REGION_CONFIG_OPTIONS, { ...config_resolver_1.NODE_REGION_CONFIG_FILE_OPTIONS, ...loaderConfig }),
      requestHandler: node_http_handler_1.NodeHttpHandler.create(config?.requestHandler ?? defaultConfigProvider),
      retryMode: config?.retryMode ?? (0, node_config_provider_1.loadConfig)({
        ...middleware_retry_1.NODE_RETRY_MODE_CONFIG_OPTIONS,
        default: async () => (await defaultConfigProvider()).retryMode || util_retry_1.DEFAULT_RETRY_MODE
      }, config),
      sha256: config?.sha256 ?? hash_node_1.Hash.bind(null, "sha256"),
      streamCollector: config?.streamCollector ?? node_http_handler_1.streamCollector,
      useDualstackEndpoint: config?.useDualstackEndpoint ?? (0, node_config_provider_1.loadConfig)(config_resolver_1.NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
      useFipsEndpoint: config?.useFipsEndpoint ?? (0, node_config_provider_1.loadConfig)(config_resolver_1.NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
      userAgentAppId: config?.userAgentAppId ?? (0, node_config_provider_1.loadConfig)(util_user_agent_node_1.NODE_APP_ID_CONFIG_OPTIONS, loaderConfig)
    };
  };
  runtimeConfig.getRuntimeConfig = getRuntimeConfig;
  return runtimeConfig;
}
var hasRequiredSsoOidc;
function requireSsoOidc() {
  if (hasRequiredSsoOidc) return ssoOidc;
  hasRequiredSsoOidc = 1;
  (function(exports$1) {
    var middlewareHostHeader = index$1.require$$0$1;
    var middlewareLogger = index$1.require$$1$2;
    var middlewareRecursionDetection = index$1.require$$2;
    var middlewareUserAgent = index$1.require$$3$1;
    var configResolver = index$1.require$$4$1;
    var core = main.requireDistCjs$1();
    var schema = main.requireSchema();
    var middlewareContentLength = index$1.require$$7$1;
    var middlewareEndpoint = index$1.require$$8$1;
    var middlewareRetry = index$1.require$$9$1;
    var smithyClient = main.require$$10;
    var httpAuthSchemeProvider2 = /* @__PURE__ */ requireHttpAuthSchemeProvider();
    var runtimeConfig2 = /* @__PURE__ */ requireRuntimeConfig();
    var regionConfigResolver = index$1.require$$13$1;
    var protocolHttp = main.require$$14;
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
    const getHttpAuthExtensionConfiguration = (runtimeConfig3) => {
      const _httpAuthSchemes = runtimeConfig3.httpAuthSchemes;
      let _httpAuthSchemeProvider = runtimeConfig3.httpAuthSchemeProvider;
      let _credentials = runtimeConfig3.credentials;
      return {
        setHttpAuthScheme(httpAuthScheme) {
          const index2 = _httpAuthSchemes.findIndex((scheme) => scheme.schemeId === httpAuthScheme.schemeId);
          if (index2 === -1) {
            _httpAuthSchemes.push(httpAuthScheme);
          } else {
            _httpAuthSchemes.splice(index2, 1, httpAuthScheme);
          }
        },
        httpAuthSchemes() {
          return _httpAuthSchemes;
        },
        setHttpAuthSchemeProvider(httpAuthSchemeProvider3) {
          _httpAuthSchemeProvider = httpAuthSchemeProvider3;
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
    const resolveRuntimeExtensions = (runtimeConfig3, extensions) => {
      const extensionConfiguration = Object.assign(regionConfigResolver.getAwsRegionExtensionConfiguration(runtimeConfig3), smithyClient.getDefaultExtensionConfiguration(runtimeConfig3), protocolHttp.getHttpHandlerExtensionConfiguration(runtimeConfig3), getHttpAuthExtensionConfiguration(runtimeConfig3));
      extensions.forEach((extension) => extension.configure(extensionConfiguration));
      return Object.assign(runtimeConfig3, regionConfigResolver.resolveAwsRegionExtensionConfiguration(extensionConfiguration), smithyClient.resolveDefaultRuntimeConfig(extensionConfiguration), protocolHttp.resolveHttpHandlerRuntimeConfig(extensionConfiguration), resolveHttpAuthRuntimeConfig(extensionConfiguration));
    };
    class SSOOIDCClient extends smithyClient.Client {
      config;
      constructor(...[configuration]) {
        const _config_0 = runtimeConfig2.getRuntimeConfig(configuration || {});
        super(_config_0);
        this.initConfig = _config_0;
        const _config_1 = resolveClientEndpointParameters(_config_0);
        const _config_2 = middlewareUserAgent.resolveUserAgentConfig(_config_1);
        const _config_3 = middlewareRetry.resolveRetryConfig(_config_2);
        const _config_4 = configResolver.resolveRegionConfig(_config_3);
        const _config_5 = middlewareHostHeader.resolveHostHeaderConfig(_config_4);
        const _config_6 = middlewareEndpoint.resolveEndpointConfig(_config_5);
        const _config_7 = httpAuthSchemeProvider2.resolveHttpAuthSchemeConfig(_config_6);
        const _config_8 = resolveRuntimeExtensions(_config_7, configuration?.extensions || []);
        this.config = _config_8;
        this.middlewareStack.use(schema.getSchemaSerdePlugin(this.config));
        this.middlewareStack.use(middlewareUserAgent.getUserAgentPlugin(this.config));
        this.middlewareStack.use(middlewareRetry.getRetryPlugin(this.config));
        this.middlewareStack.use(middlewareContentLength.getContentLengthPlugin(this.config));
        this.middlewareStack.use(middlewareHostHeader.getHostHeaderPlugin(this.config));
        this.middlewareStack.use(middlewareLogger.getLoggerPlugin(this.config));
        this.middlewareStack.use(middlewareRecursionDetection.getRecursionDetectionPlugin(this.config));
        this.middlewareStack.use(core.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
          httpAuthSchemeParametersProvider: httpAuthSchemeProvider2.defaultSSOOIDCHttpAuthSchemeParametersProvider,
          identityProviderConfigProvider: async (config) => new core.DefaultIdentityProviderConfig({
            "aws.auth#sigv4": config.credentials
          })
        }));
        this.middlewareStack.use(core.getHttpSigningPlugin(this.config));
      }
      destroy() {
        super.destroy();
      }
    }
    let SSOOIDCServiceException$1 = class SSOOIDCServiceException2 extends smithyClient.ServiceException {
      constructor(options) {
        super(options);
        Object.setPrototypeOf(this, SSOOIDCServiceException2.prototype);
      }
    };
    let AccessDeniedException$1 = class AccessDeniedException2 extends SSOOIDCServiceException$1 {
      name = "AccessDeniedException";
      $fault = "client";
      error;
      reason;
      error_description;
      constructor(opts) {
        super({
          name: "AccessDeniedException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, AccessDeniedException2.prototype);
        this.error = opts.error;
        this.reason = opts.reason;
        this.error_description = opts.error_description;
      }
    };
    let AuthorizationPendingException$1 = class AuthorizationPendingException2 extends SSOOIDCServiceException$1 {
      name = "AuthorizationPendingException";
      $fault = "client";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "AuthorizationPendingException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, AuthorizationPendingException2.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
      }
    };
    let ExpiredTokenException$1 = class ExpiredTokenException2 extends SSOOIDCServiceException$1 {
      name = "ExpiredTokenException";
      $fault = "client";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "ExpiredTokenException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, ExpiredTokenException2.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
      }
    };
    let InternalServerException$1 = class InternalServerException2 extends SSOOIDCServiceException$1 {
      name = "InternalServerException";
      $fault = "server";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "InternalServerException",
          $fault: "server",
          ...opts
        });
        Object.setPrototypeOf(this, InternalServerException2.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
      }
    };
    let InvalidClientException$1 = class InvalidClientException2 extends SSOOIDCServiceException$1 {
      name = "InvalidClientException";
      $fault = "client";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "InvalidClientException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, InvalidClientException2.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
      }
    };
    let InvalidGrantException$1 = class InvalidGrantException2 extends SSOOIDCServiceException$1 {
      name = "InvalidGrantException";
      $fault = "client";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "InvalidGrantException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, InvalidGrantException2.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
      }
    };
    let InvalidRequestException$1 = class InvalidRequestException2 extends SSOOIDCServiceException$1 {
      name = "InvalidRequestException";
      $fault = "client";
      error;
      reason;
      error_description;
      constructor(opts) {
        super({
          name: "InvalidRequestException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, InvalidRequestException2.prototype);
        this.error = opts.error;
        this.reason = opts.reason;
        this.error_description = opts.error_description;
      }
    };
    let InvalidScopeException$1 = class InvalidScopeException2 extends SSOOIDCServiceException$1 {
      name = "InvalidScopeException";
      $fault = "client";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "InvalidScopeException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, InvalidScopeException2.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
      }
    };
    let SlowDownException$1 = class SlowDownException2 extends SSOOIDCServiceException$1 {
      name = "SlowDownException";
      $fault = "client";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "SlowDownException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, SlowDownException2.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
      }
    };
    let UnauthorizedClientException$1 = class UnauthorizedClientException2 extends SSOOIDCServiceException$1 {
      name = "UnauthorizedClientException";
      $fault = "client";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "UnauthorizedClientException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, UnauthorizedClientException2.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
      }
    };
    let UnsupportedGrantTypeException$1 = class UnsupportedGrantTypeException2 extends SSOOIDCServiceException$1 {
      name = "UnsupportedGrantTypeException";
      $fault = "client";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "UnsupportedGrantTypeException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, UnsupportedGrantTypeException2.prototype);
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
    var AccessDeniedException = [
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
    schema.TypeRegistry.for(n0).registerError(AccessDeniedException, AccessDeniedException$1);
    var AuthorizationPendingException = [
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
    schema.TypeRegistry.for(n0).registerError(AuthorizationPendingException, AuthorizationPendingException$1);
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
    var ExpiredTokenException = [
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
    schema.TypeRegistry.for(n0).registerError(ExpiredTokenException, ExpiredTokenException$1);
    var InternalServerException = [
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
    schema.TypeRegistry.for(n0).registerError(InternalServerException, InternalServerException$1);
    var InvalidClientException = [
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
    schema.TypeRegistry.for(n0).registerError(InvalidClientException, InvalidClientException$1);
    var InvalidGrantException = [
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
    schema.TypeRegistry.for(n0).registerError(InvalidGrantException, InvalidGrantException$1);
    var InvalidRequestException = [
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
    schema.TypeRegistry.for(n0).registerError(InvalidRequestException, InvalidRequestException$1);
    var InvalidScopeException = [
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
    schema.TypeRegistry.for(n0).registerError(InvalidScopeException, InvalidScopeException$1);
    var SlowDownException = [
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
    schema.TypeRegistry.for(n0).registerError(SlowDownException, SlowDownException$1);
    var UnauthorizedClientException = [
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
    schema.TypeRegistry.for(n0).registerError(UnauthorizedClientException, UnauthorizedClientException$1);
    var UnsupportedGrantTypeException = [
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
    schema.TypeRegistry.for(n0).registerError(UnsupportedGrantTypeException, UnsupportedGrantTypeException$1);
    var SSOOIDCServiceException = [-3, _sm, "SSOOIDCServiceException", 0, [], []];
    schema.TypeRegistry.for(_sm).registerError(SSOOIDCServiceException, SSOOIDCServiceException$1);
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
    class CreateTokenCommand extends smithyClient.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    }).s("AWSSSOOIDCService", "CreateToken", {}).n("SSOOIDCClient", "CreateTokenCommand").sc(CreateToken).build() {
    }
    const commands = {
      CreateTokenCommand
    };
    class SSOOIDC extends SSOOIDCClient {
    }
    smithyClient.createAggregatedClient(commands, SSOOIDC);
    const AccessDeniedExceptionReason = {
      KMS_ACCESS_DENIED: "KMS_AccessDeniedException"
    };
    const InvalidRequestExceptionReason = {
      KMS_DISABLED_KEY: "KMS_DisabledException",
      KMS_INVALID_KEY_USAGE: "KMS_InvalidKeyUsageException",
      KMS_INVALID_STATE: "KMS_InvalidStateException",
      KMS_KEY_NOT_FOUND: "KMS_NotFoundException"
    };
    Object.defineProperty(exports$1, "$Command", {
      enumerable: true,
      get: function() {
        return smithyClient.Command;
      }
    });
    Object.defineProperty(exports$1, "__Client", {
      enumerable: true,
      get: function() {
        return smithyClient.Client;
      }
    });
    exports$1.AccessDeniedException = AccessDeniedException$1;
    exports$1.AccessDeniedExceptionReason = AccessDeniedExceptionReason;
    exports$1.AuthorizationPendingException = AuthorizationPendingException$1;
    exports$1.CreateTokenCommand = CreateTokenCommand;
    exports$1.ExpiredTokenException = ExpiredTokenException$1;
    exports$1.InternalServerException = InternalServerException$1;
    exports$1.InvalidClientException = InvalidClientException$1;
    exports$1.InvalidGrantException = InvalidGrantException$1;
    exports$1.InvalidRequestException = InvalidRequestException$1;
    exports$1.InvalidRequestExceptionReason = InvalidRequestExceptionReason;
    exports$1.InvalidScopeException = InvalidScopeException$1;
    exports$1.SSOOIDC = SSOOIDC;
    exports$1.SSOOIDCClient = SSOOIDCClient;
    exports$1.SSOOIDCServiceException = SSOOIDCServiceException$1;
    exports$1.SlowDownException = SlowDownException$1;
    exports$1.UnauthorizedClientException = UnauthorizedClientException$1;
    exports$1.UnsupportedGrantTypeException = UnsupportedGrantTypeException$1;
  })(ssoOidc);
  return ssoOidc;
}
var ssoOidcExports = requireSsoOidc();
const index = /* @__PURE__ */ _mergeNamespaces({
  __proto__: null
}, [ssoOidcExports]);
exports.index = index;
