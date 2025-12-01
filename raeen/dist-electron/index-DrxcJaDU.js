"use strict";
const main$1 = require("./main-BIF8JQzB.js");
const http2 = require("http2");
class NodeHttp2ConnectionPool {
  sessions = [];
  constructor(sessions) {
    this.sessions = sessions ?? [];
  }
  poll() {
    if (this.sessions.length > 0) {
      return this.sessions.shift();
    }
  }
  offerLast(session) {
    this.sessions.push(session);
  }
  contains(session) {
    return this.sessions.includes(session);
  }
  remove(session) {
    this.sessions = this.sessions.filter((s) => s !== session);
  }
  [Symbol.iterator]() {
    return this.sessions[Symbol.iterator]();
  }
  destroy(connection) {
    for (const session of this.sessions) {
      if (session === connection) {
        if (!session.destroyed) {
          session.destroy();
        }
      }
    }
  }
}
class NodeHttp2ConnectionManager {
  constructor(config) {
    this.config = config;
    if (this.config.maxConcurrency && this.config.maxConcurrency <= 0) {
      throw new RangeError("maxConcurrency must be greater than zero.");
    }
  }
  config;
  sessionCache = /* @__PURE__ */ new Map();
  lease(requestContext, connectionConfiguration) {
    const url = this.getUrlString(requestContext);
    const existingPool = this.sessionCache.get(url);
    if (existingPool) {
      const existingSession = existingPool.poll();
      if (existingSession && !this.config.disableConcurrency) {
        return existingSession;
      }
    }
    const session = http2.connect(url);
    if (this.config.maxConcurrency) {
      session.settings({ maxConcurrentStreams: this.config.maxConcurrency }, (err) => {
        if (err) {
          throw new Error("Fail to set maxConcurrentStreams to " + this.config.maxConcurrency + "when creating new session for " + requestContext.destination.toString());
        }
      });
    }
    session.unref();
    const destroySessionCb = () => {
      session.destroy();
      this.deleteSession(url, session);
    };
    session.on("goaway", destroySessionCb);
    session.on("error", destroySessionCb);
    session.on("frameError", destroySessionCb);
    session.on("close", () => this.deleteSession(url, session));
    if (connectionConfiguration.requestTimeout) {
      session.setTimeout(connectionConfiguration.requestTimeout, destroySessionCb);
    }
    const connectionPool = this.sessionCache.get(url) || new NodeHttp2ConnectionPool();
    connectionPool.offerLast(session);
    this.sessionCache.set(url, connectionPool);
    return session;
  }
  deleteSession(authority, session) {
    const existingConnectionPool = this.sessionCache.get(authority);
    if (!existingConnectionPool) {
      return;
    }
    if (!existingConnectionPool.contains(session)) {
      return;
    }
    existingConnectionPool.remove(session);
    this.sessionCache.set(authority, existingConnectionPool);
  }
  release(requestContext, session) {
    const cacheKey = this.getUrlString(requestContext);
    this.sessionCache.get(cacheKey)?.offerLast(session);
  }
  destroy() {
    for (const [key, connectionPool] of this.sessionCache) {
      for (const session of connectionPool) {
        if (!session.destroyed) {
          session.destroy();
        }
        connectionPool.remove(session);
      }
      this.sessionCache.delete(key);
    }
  }
  setMaxConcurrentStreams(maxConcurrentStreams) {
    if (maxConcurrentStreams && maxConcurrentStreams <= 0) {
      throw new RangeError("maxConcurrentStreams must be greater than zero.");
    }
    this.config.maxConcurrency = maxConcurrentStreams;
  }
  setDisableConcurrentStreams(disableConcurrentStreams) {
    this.config.disableConcurrency = disableConcurrentStreams;
  }
  getUrlString(request) {
    return request.destination.toString();
  }
}
class NodeHttp2Handler {
  config;
  configProvider;
  metadata = { handlerProtocol: "h2" };
  connectionManager = new NodeHttp2ConnectionManager({});
  static create(instanceOrOptions) {
    if (typeof instanceOrOptions?.handle === "function") {
      return instanceOrOptions;
    }
    return new NodeHttp2Handler(instanceOrOptions);
  }
  constructor(options) {
    this.configProvider = new Promise((resolve, reject) => {
      if (typeof options === "function") {
        options().then((opts) => {
          resolve(opts || {});
        }).catch(reject);
      } else {
        resolve(options || {});
      }
    });
  }
  destroy() {
    this.connectionManager.destroy();
  }
  async handle(request, { abortSignal, requestTimeout } = {}) {
    if (!this.config) {
      this.config = await this.configProvider;
      this.connectionManager.setDisableConcurrentStreams(this.config.disableConcurrentStreams || false);
      if (this.config.maxConcurrentStreams) {
        this.connectionManager.setMaxConcurrentStreams(this.config.maxConcurrentStreams);
      }
    }
    const { requestTimeout: configRequestTimeout, disableConcurrentStreams } = this.config;
    const effectiveRequestTimeout = requestTimeout ?? configRequestTimeout;
    return new Promise((_resolve, _reject) => {
      let fulfilled = false;
      let writeRequestBodyPromise = void 0;
      const resolve = async (arg) => {
        await writeRequestBodyPromise;
        _resolve(arg);
      };
      const reject = async (arg) => {
        await writeRequestBodyPromise;
        _reject(arg);
      };
      if (abortSignal?.aborted) {
        fulfilled = true;
        const abortError = new Error("Request aborted");
        abortError.name = "AbortError";
        reject(abortError);
        return;
      }
      const { hostname, method, port, protocol, query } = request;
      let auth = "";
      if (request.username != null || request.password != null) {
        const username = request.username ?? "";
        const password = request.password ?? "";
        auth = `${username}:${password}@`;
      }
      const authority = `${protocol}//${auth}${hostname}${port ? `:${port}` : ""}`;
      const requestContext = { destination: new URL(authority) };
      const session = this.connectionManager.lease(requestContext, {
        requestTimeout: this.config?.sessionTimeout,
        disableConcurrentStreams: disableConcurrentStreams || false
      });
      const rejectWithDestroy = (err) => {
        if (disableConcurrentStreams) {
          this.destroySession(session);
        }
        fulfilled = true;
        reject(err);
      };
      const queryString = main$1.buildQueryString(query || {});
      let path = request.path;
      if (queryString) {
        path += `?${queryString}`;
      }
      if (request.fragment) {
        path += `#${request.fragment}`;
      }
      const req = session.request({
        ...request.headers,
        [http2.constants.HTTP2_HEADER_PATH]: path,
        [http2.constants.HTTP2_HEADER_METHOD]: method
      });
      session.ref();
      req.on("response", (headers) => {
        const httpResponse = new main$1.HttpResponse({
          statusCode: headers[":status"] || -1,
          headers: main$1.getTransformedHeaders(headers),
          body: req
        });
        fulfilled = true;
        resolve({ response: httpResponse });
        if (disableConcurrentStreams) {
          session.close();
          this.connectionManager.deleteSession(authority, session);
        }
      });
      if (effectiveRequestTimeout) {
        req.setTimeout(effectiveRequestTimeout, () => {
          req.close();
          const timeoutError = new Error(`Stream timed out because of no activity for ${effectiveRequestTimeout} ms`);
          timeoutError.name = "TimeoutError";
          rejectWithDestroy(timeoutError);
        });
      }
      if (abortSignal) {
        const onAbort = () => {
          req.close();
          const abortError = new Error("Request aborted");
          abortError.name = "AbortError";
          rejectWithDestroy(abortError);
        };
        if (typeof abortSignal.addEventListener === "function") {
          const signal = abortSignal;
          signal.addEventListener("abort", onAbort, { once: true });
          req.once("close", () => signal.removeEventListener("abort", onAbort));
        } else {
          abortSignal.onabort = onAbort;
        }
      }
      req.on("frameError", (type, code, id) => {
        rejectWithDestroy(new Error(`Frame type id ${type} in stream id ${id} has failed with code ${code}.`));
      });
      req.on("error", rejectWithDestroy);
      req.on("aborted", () => {
        rejectWithDestroy(new Error(`HTTP/2 stream is abnormally aborted in mid-communication with result code ${req.rstCode}.`));
      });
      req.on("close", () => {
        session.unref();
        if (disableConcurrentStreams) {
          session.destroy();
        }
        if (!fulfilled) {
          rejectWithDestroy(new Error("Unexpected error: http2 request did not get a response"));
        }
      });
      writeRequestBodyPromise = main$1.writeRequestBody(req, request, effectiveRequestTimeout);
    });
  }
  updateHttpClientConfig(key, value) {
    this.config = void 0;
    this.configProvider = this.configProvider.then((config) => {
      return {
        ...config,
        [key]: value
      };
    });
  }
  httpHandlerConfigs() {
    return this.config ?? {};
  }
  destroySession(session) {
    if (!session.destroyed) {
      session.destroy();
    }
  }
}
const distEs$e = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  DEFAULT_REQUEST_TIMEOUT: main$1.DEFAULT_REQUEST_TIMEOUT,
  NodeHttp2Handler,
  NodeHttpHandler: main$1.NodeHttpHandler,
  streamCollector: main$1.streamCollector
}, Symbol.toStringTag, { value: "Module" }));
const distEs$d = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getLoggerPlugin: main$1.getLoggerPlugin,
  loggerMiddleware: main$1.loggerMiddleware,
  loggerMiddlewareOptions: main$1.loggerMiddlewareOptions
}, Symbol.toStringTag, { value: "Module" }));
const distEs$c = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getRecursionDetectionPlugin: main$1.getRecursionDetectionPlugin,
  recursionDetectionMiddleware: main$1.recursionDetectionMiddleware
}, Symbol.toStringTag, { value: "Module" }));
const distEs$b = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  EndpointCache: main$1.EndpointCache,
  EndpointError: main$1.EndpointError,
  customEndpointFunctions: main$1.customEndpointFunctions,
  isIpAddress: main$1.isIpAddress,
  isValidHostLabel: main$1.isValidHostLabel,
  resolveEndpoint: main$1.resolveEndpoint
}, Symbol.toStringTag, { value: "Module" }));
const resolveDefaultAwsRegionalEndpointsConfig = (input) => {
  if (typeof input.endpointProvider !== "function") {
    throw new Error("@aws-sdk/util-endpoint - endpointProvider and endpoint missing in config for this client.");
  }
  const { endpoint } = input;
  if (endpoint === void 0) {
    input.endpoint = async () => {
      return toEndpointV1(input.endpointProvider({
        Region: typeof input.region === "function" ? await input.region() : input.region,
        UseDualStack: typeof input.useDualstackEndpoint === "function" ? await input.useDualstackEndpoint() : input.useDualstackEndpoint,
        UseFIPS: typeof input.useFipsEndpoint === "function" ? await input.useFipsEndpoint() : input.useFipsEndpoint,
        Endpoint: void 0
      }, { logger: input.logger }));
    };
  }
  return input;
};
const toEndpointV1 = (endpoint) => main$1.parseUrl(endpoint.url);
const distEs$a = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  EndpointError: main$1.EndpointError,
  awsEndpointFunctions: main$1.awsEndpointFunctions,
  getUserAgentPrefix: main$1.getUserAgentPrefix,
  isIpAddress: main$1.isIpAddress,
  partition: main$1.partition,
  resolveDefaultAwsRegionalEndpointsConfig,
  resolveEndpoint: main$1.resolveEndpoint,
  setPartitionInfo: main$1.setPartitionInfo,
  toEndpointV1,
  useDefaultPartitionInfo: main$1.useDefaultPartitionInfo
}, Symbol.toStringTag, { value: "Module" }));
const distEs$9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  DEFAULT_UA_APP_ID: main$1.DEFAULT_UA_APP_ID,
  getUserAgentMiddlewareOptions: main$1.getUserAgentMiddlewareOptions,
  getUserAgentPlugin: main$1.getUserAgentPlugin,
  resolveUserAgentConfig: main$1.resolveUserAgentConfig,
  userAgentMiddleware: main$1.userAgentMiddleware
}, Symbol.toStringTag, { value: "Module" }));
const resolveCustomEndpointsConfig = (input) => {
  const { tls, endpoint, urlParser, useDualstackEndpoint } = input;
  return Object.assign(input, {
    tls: tls ?? true,
    endpoint: main$1.normalizeProvider(typeof endpoint === "string" ? urlParser(endpoint) : endpoint),
    isCustomEndpoint: true,
    useDualstackEndpoint: main$1.normalizeProvider(useDualstackEndpoint ?? false)
  });
};
const getEndpointFromRegion = async (input) => {
  const { tls = true } = input;
  const region = await input.region();
  const dnsHostRegex = new RegExp(/^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])$/);
  if (!dnsHostRegex.test(region)) {
    throw new Error("Invalid region in client config");
  }
  const useDualstackEndpoint = await input.useDualstackEndpoint();
  const useFipsEndpoint = await input.useFipsEndpoint();
  const { hostname } = await input.regionInfoProvider(region, { useDualstackEndpoint, useFipsEndpoint }) ?? {};
  if (!hostname) {
    throw new Error("Cannot resolve hostname from client config");
  }
  return input.urlParser(`${tls ? "https:" : "http:"}//${hostname}`);
};
const resolveEndpointsConfig = (input) => {
  const useDualstackEndpoint = main$1.normalizeProvider(input.useDualstackEndpoint ?? false);
  const { endpoint, useFipsEndpoint, urlParser, tls } = input;
  return Object.assign(input, {
    tls: tls ?? true,
    endpoint: endpoint ? main$1.normalizeProvider(typeof endpoint === "string" ? urlParser(endpoint) : endpoint) : () => getEndpointFromRegion({ ...input, useDualstackEndpoint, useFipsEndpoint }),
    isCustomEndpoint: !!endpoint,
    useDualstackEndpoint
  });
};
const getHostnameFromVariants = (variants = [], { useFipsEndpoint, useDualstackEndpoint }) => variants.find(({ tags }) => useFipsEndpoint === tags.includes("fips") && useDualstackEndpoint === tags.includes("dualstack"))?.hostname;
const getResolvedHostname = (resolvedRegion, { regionHostname, partitionHostname }) => regionHostname ? regionHostname : partitionHostname ? partitionHostname.replace("{region}", resolvedRegion) : void 0;
const getResolvedPartition = (region, { partitionHash }) => Object.keys(partitionHash || {}).find((key) => partitionHash[key].regions.includes(region)) ?? "aws";
const getResolvedSigningRegion = (hostname, { signingRegion, regionRegex, useFipsEndpoint }) => {
  if (signingRegion) {
    return signingRegion;
  } else if (useFipsEndpoint) {
    const regionRegexJs = regionRegex.replace("\\\\", "\\").replace(/^\^/g, "\\.").replace(/\$$/g, "\\.");
    const regionRegexmatchArray = hostname.match(regionRegexJs);
    if (regionRegexmatchArray) {
      return regionRegexmatchArray[0].slice(1, -1);
    }
  }
};
const getRegionInfo = (region, { useFipsEndpoint = false, useDualstackEndpoint = false, signingService, regionHash, partitionHash }) => {
  const partition = getResolvedPartition(region, { partitionHash });
  const resolvedRegion = region in regionHash ? region : partitionHash[partition]?.endpoint ?? region;
  const hostnameOptions = { useFipsEndpoint, useDualstackEndpoint };
  const regionHostname = getHostnameFromVariants(regionHash[resolvedRegion]?.variants, hostnameOptions);
  const partitionHostname = getHostnameFromVariants(partitionHash[partition]?.variants, hostnameOptions);
  const hostname = getResolvedHostname(resolvedRegion, { regionHostname, partitionHostname });
  if (hostname === void 0) {
    throw new Error(`Endpoint resolution failed for: ${{ resolvedRegion, useFipsEndpoint, useDualstackEndpoint }}`);
  }
  const signingRegion = getResolvedSigningRegion(hostname, {
    signingRegion: regionHash[resolvedRegion]?.signingRegion,
    regionRegex: partitionHash[partition].regionRegex,
    useFipsEndpoint
  });
  return {
    partition,
    signingService,
    hostname,
    ...signingRegion && { signingRegion },
    ...regionHash[resolvedRegion]?.signingService && {
      signingService: regionHash[resolvedRegion].signingService
    }
  };
};
const distEs$8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  CONFIG_USE_DUALSTACK_ENDPOINT: main$1.CONFIG_USE_DUALSTACK_ENDPOINT,
  CONFIG_USE_FIPS_ENDPOINT: main$1.CONFIG_USE_FIPS_ENDPOINT,
  DEFAULT_USE_DUALSTACK_ENDPOINT: main$1.DEFAULT_USE_DUALSTACK_ENDPOINT,
  DEFAULT_USE_FIPS_ENDPOINT: main$1.DEFAULT_USE_FIPS_ENDPOINT,
  ENV_USE_DUALSTACK_ENDPOINT: main$1.ENV_USE_DUALSTACK_ENDPOINT,
  ENV_USE_FIPS_ENDPOINT: main$1.ENV_USE_FIPS_ENDPOINT,
  NODE_REGION_CONFIG_FILE_OPTIONS: main$1.NODE_REGION_CONFIG_FILE_OPTIONS,
  NODE_REGION_CONFIG_OPTIONS: main$1.NODE_REGION_CONFIG_OPTIONS,
  NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS: main$1.NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS,
  NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS: main$1.NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS,
  REGION_ENV_NAME: main$1.REGION_ENV_NAME,
  REGION_INI_NAME: main$1.REGION_INI_NAME,
  getRegionInfo,
  resolveCustomEndpointsConfig,
  resolveEndpointsConfig,
  resolveRegionConfig: main$1.resolveRegionConfig
}, Symbol.toStringTag, { value: "Module" }));
const distEs$7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loadConfig: main$1.loadConfig
}, Symbol.toStringTag, { value: "Module" }));
const resolveEndpointRequiredConfig = (input) => {
  const { endpoint } = input;
  if (endpoint === void 0) {
    input.endpoint = async () => {
      throw new Error("@smithy/middleware-endpoint: (default endpointRuleSet) endpoint is not set - you must configure an endpoint.");
    };
  }
  return input;
};
const distEs$6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  endpointMiddleware: main$1.endpointMiddleware,
  endpointMiddlewareOptions: main$1.endpointMiddlewareOptions,
  getEndpointFromInstructions: main$1.getEndpointFromInstructions,
  getEndpointPlugin: main$1.getEndpointPlugin,
  resolveEndpointConfig: main$1.resolveEndpointConfig,
  resolveEndpointRequiredConfig,
  resolveParams: main$1.resolveParams,
  toEndpointV1: main$1.toEndpointV1
}, Symbol.toStringTag, { value: "Module" }));
class ConfiguredRetryStrategy extends main$1.StandardRetryStrategy {
  computeNextBackoffDelay;
  constructor(maxAttempts, computeNextBackoffDelay = main$1.DEFAULT_RETRY_DELAY_BASE) {
    super(typeof maxAttempts === "function" ? maxAttempts : async () => maxAttempts);
    if (typeof computeNextBackoffDelay === "number") {
      this.computeNextBackoffDelay = () => computeNextBackoffDelay;
    } else {
      this.computeNextBackoffDelay = computeNextBackoffDelay;
    }
  }
  async refreshRetryTokenForRetry(tokenToRenew, errorInfo) {
    const token = await super.refreshRetryTokenForRetry(tokenToRenew, errorInfo);
    token.getRetryDelay = () => this.computeNextBackoffDelay(token.getRetryCount());
    return token;
  }
}
const distEs$5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  AdaptiveRetryStrategy: main$1.AdaptiveRetryStrategy,
  ConfiguredRetryStrategy,
  DEFAULT_MAX_ATTEMPTS: main$1.DEFAULT_MAX_ATTEMPTS,
  DEFAULT_RETRY_DELAY_BASE: main$1.DEFAULT_RETRY_DELAY_BASE,
  DEFAULT_RETRY_MODE: main$1.DEFAULT_RETRY_MODE,
  DefaultRateLimiter: main$1.DefaultRateLimiter,
  INITIAL_RETRY_TOKENS: main$1.INITIAL_RETRY_TOKENS,
  INVOCATION_ID_HEADER: main$1.INVOCATION_ID_HEADER,
  MAXIMUM_RETRY_DELAY: main$1.MAXIMUM_RETRY_DELAY,
  NO_RETRY_INCREMENT: main$1.NO_RETRY_INCREMENT,
  REQUEST_HEADER: main$1.REQUEST_HEADER,
  RETRY_COST: main$1.RETRY_COST,
  get RETRY_MODES() {
    return main$1.RETRY_MODES;
  },
  StandardRetryStrategy: main$1.StandardRetryStrategy,
  THROTTLING_RETRY_DELAY_BASE: main$1.THROTTLING_RETRY_DELAY_BASE,
  TIMEOUT_RETRY_COST: main$1.TIMEOUT_RETRY_COST
}, Symbol.toStringTag, { value: "Module" }));
const getDefaultRetryQuota = (initialRetryTokens, options) => {
  const MAX_CAPACITY = initialRetryTokens;
  const noRetryIncrement = main$1.NO_RETRY_INCREMENT;
  const retryCost = main$1.RETRY_COST;
  const timeoutRetryCost = main$1.TIMEOUT_RETRY_COST;
  let availableCapacity = initialRetryTokens;
  const getCapacityAmount = (error) => error.name === "TimeoutError" ? timeoutRetryCost : retryCost;
  const hasRetryTokens = (error) => getCapacityAmount(error) <= availableCapacity;
  const retrieveRetryTokens = (error) => {
    if (!hasRetryTokens(error)) {
      throw new Error("No retry token available");
    }
    const capacityAmount = getCapacityAmount(error);
    availableCapacity -= capacityAmount;
    return capacityAmount;
  };
  const releaseRetryTokens = (capacityReleaseAmount) => {
    availableCapacity += capacityReleaseAmount ?? noRetryIncrement;
    availableCapacity = Math.min(availableCapacity, MAX_CAPACITY);
  };
  return Object.freeze({
    hasRetryTokens,
    retrieveRetryTokens,
    releaseRetryTokens
  });
};
const defaultDelayDecider = (delayBase, attempts) => Math.floor(Math.min(main$1.MAXIMUM_RETRY_DELAY, Math.random() * 2 ** attempts * delayBase));
const defaultRetryDecider = (error) => {
  if (!error) {
    return false;
  }
  return main$1.isRetryableByTrait(error) || main$1.isClockSkewError(error) || main$1.isThrottlingError(error) || main$1.isTransientError(error);
};
class StandardRetryStrategy {
  maxAttemptsProvider;
  retryDecider;
  delayDecider;
  retryQuota;
  mode = main$1.RETRY_MODES.STANDARD;
  constructor(maxAttemptsProvider, options) {
    this.maxAttemptsProvider = maxAttemptsProvider;
    this.retryDecider = options?.retryDecider ?? defaultRetryDecider;
    this.delayDecider = options?.delayDecider ?? defaultDelayDecider;
    this.retryQuota = options?.retryQuota ?? getDefaultRetryQuota(main$1.INITIAL_RETRY_TOKENS);
  }
  shouldRetry(error, attempts, maxAttempts) {
    return attempts < maxAttempts && this.retryDecider(error) && this.retryQuota.hasRetryTokens(error);
  }
  async getMaxAttempts() {
    let maxAttempts;
    try {
      maxAttempts = await this.maxAttemptsProvider();
    } catch (error) {
      maxAttempts = main$1.DEFAULT_MAX_ATTEMPTS;
    }
    return maxAttempts;
  }
  async retry(next, args, options) {
    let retryTokenAmount;
    let attempts = 0;
    let totalDelay = 0;
    const maxAttempts = await this.getMaxAttempts();
    const { request } = args;
    if (main$1.HttpRequest.isInstance(request)) {
      request.headers[main$1.INVOCATION_ID_HEADER] = main$1.v4();
    }
    while (true) {
      try {
        if (main$1.HttpRequest.isInstance(request)) {
          request.headers[main$1.REQUEST_HEADER] = `attempt=${attempts + 1}; max=${maxAttempts}`;
        }
        if (options?.beforeRequest) {
          await options.beforeRequest();
        }
        const { response, output } = await next(args);
        if (options?.afterRequest) {
          options.afterRequest(response);
        }
        this.retryQuota.releaseRetryTokens(retryTokenAmount);
        output.$metadata.attempts = attempts + 1;
        output.$metadata.totalRetryDelay = totalDelay;
        return { response, output };
      } catch (e) {
        const err = main$1.asSdkError(e);
        attempts++;
        if (this.shouldRetry(err, attempts, maxAttempts)) {
          retryTokenAmount = this.retryQuota.retrieveRetryTokens(err);
          const delayFromDecider = this.delayDecider(main$1.isThrottlingError(err) ? main$1.THROTTLING_RETRY_DELAY_BASE : main$1.DEFAULT_RETRY_DELAY_BASE, attempts);
          const delayFromResponse = getDelayFromRetryAfterHeader(err.$response);
          const delay = Math.max(delayFromResponse || 0, delayFromDecider);
          totalDelay += delay;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        if (!err.$metadata) {
          err.$metadata = {};
        }
        err.$metadata.attempts = attempts;
        err.$metadata.totalRetryDelay = totalDelay;
        throw err;
      }
    }
  }
}
const getDelayFromRetryAfterHeader = (response) => {
  if (!main$1.HttpResponse.isInstance(response))
    return;
  const retryAfterHeaderName = Object.keys(response.headers).find((key) => key.toLowerCase() === "retry-after");
  if (!retryAfterHeaderName)
    return;
  const retryAfter = response.headers[retryAfterHeaderName];
  const retryAfterSeconds = Number(retryAfter);
  if (!Number.isNaN(retryAfterSeconds))
    return retryAfterSeconds * 1e3;
  const retryAfterDate = new Date(retryAfter);
  return retryAfterDate.getTime() - Date.now();
};
class AdaptiveRetryStrategy extends StandardRetryStrategy {
  rateLimiter;
  constructor(maxAttemptsProvider, options) {
    const { rateLimiter, ...superOptions } = options ?? {};
    super(maxAttemptsProvider, superOptions);
    this.rateLimiter = rateLimiter ?? new main$1.DefaultRateLimiter();
    this.mode = main$1.RETRY_MODES.ADAPTIVE;
  }
  async retry(next, args) {
    return super.retry(next, args, {
      beforeRequest: async () => {
        return this.rateLimiter.getSendToken();
      },
      afterRequest: (response) => {
        this.rateLimiter.updateClientSendingRate(response);
      }
    });
  }
}
const omitRetryHeadersMiddleware = () => (next) => async (args) => {
  const { request } = args;
  if (main$1.HttpRequest.isInstance(request)) {
    delete request.headers[main$1.INVOCATION_ID_HEADER];
    delete request.headers[main$1.REQUEST_HEADER];
  }
  return next(args);
};
const omitRetryHeadersMiddlewareOptions = {
  name: "omitRetryHeadersMiddleware",
  tags: ["RETRY", "HEADERS", "OMIT_RETRY_HEADERS"],
  relation: "before",
  toMiddleware: "awsAuthMiddleware",
  override: true
};
const getOmitRetryHeadersPlugin = (options) => ({
  applyToStack: (clientStack) => {
    clientStack.addRelativeTo(omitRetryHeadersMiddleware(), omitRetryHeadersMiddlewareOptions);
  }
});
const distEs$4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  AdaptiveRetryStrategy,
  CONFIG_MAX_ATTEMPTS: main$1.CONFIG_MAX_ATTEMPTS,
  CONFIG_RETRY_MODE: main$1.CONFIG_RETRY_MODE,
  ENV_MAX_ATTEMPTS: main$1.ENV_MAX_ATTEMPTS,
  ENV_RETRY_MODE: main$1.ENV_RETRY_MODE,
  NODE_MAX_ATTEMPT_CONFIG_OPTIONS: main$1.NODE_MAX_ATTEMPT_CONFIG_OPTIONS,
  NODE_RETRY_MODE_CONFIG_OPTIONS: main$1.NODE_RETRY_MODE_CONFIG_OPTIONS,
  StandardRetryStrategy,
  defaultDelayDecider,
  defaultRetryDecider,
  getOmitRetryHeadersPlugin,
  getRetryAfterHint: main$1.getRetryAfterHint,
  getRetryPlugin: main$1.getRetryPlugin,
  omitRetryHeadersMiddleware,
  omitRetryHeadersMiddlewareOptions,
  resolveRetryConfig: main$1.resolveRetryConfig,
  retryMiddleware: main$1.retryMiddleware,
  retryMiddlewareOptions: main$1.retryMiddlewareOptions
}, Symbol.toStringTag, { value: "Module" }));
const distEs$3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  NODE_APP_ID_CONFIG_OPTIONS: main$1.NODE_APP_ID_CONFIG_OPTIONS,
  UA_APP_ID_ENV_NAME: main$1.UA_APP_ID_ENV_NAME,
  UA_APP_ID_INI_NAME: main$1.UA_APP_ID_INI_NAME,
  createDefaultUserAgentProvider: main$1.createDefaultUserAgentProvider,
  crtAvailability: main$1.crtAvailability,
  defaultUserAgent: main$1.defaultUserAgent
}, Symbol.toStringTag, { value: "Module" }));
const distEs$2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  calculateBodyLength: main$1.calculateBodyLength
}, Symbol.toStringTag, { value: "Module" }));
const distEs$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  resolveDefaultsModeConfig: main$1.resolveDefaultsModeConfig
}, Symbol.toStringTag, { value: "Module" }));
function stsRegionDefaultResolver(loaderConfig = {}) {
  return main$1.loadConfig({
    ...main$1.NODE_REGION_CONFIG_OPTIONS,
    async default() {
      if (!warning.silence) {
        console.warn("@aws-sdk - WARN - default STS region of us-east-1 used. See @aws-sdk/credential-providers README and set a region explicitly.");
      }
      return "us-east-1";
    }
  }, { ...main$1.NODE_REGION_CONFIG_FILE_OPTIONS, ...loaderConfig });
}
const warning = {
  silence: false
};
const distEs = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  NODE_REGION_CONFIG_FILE_OPTIONS: main$1.NODE_REGION_CONFIG_FILE_OPTIONS,
  NODE_REGION_CONFIG_OPTIONS: main$1.NODE_REGION_CONFIG_OPTIONS,
  REGION_ENV_NAME: main$1.REGION_ENV_NAME,
  REGION_INI_NAME: main$1.REGION_INI_NAME,
  getAwsRegionExtensionConfiguration: main$1.getAwsRegionExtensionConfiguration,
  resolveAwsRegionExtensionConfiguration: main$1.resolveAwsRegionExtensionConfiguration,
  resolveRegionConfig: main$1.resolveRegionConfig,
  stsRegionDefaultResolver,
  warning
}, Symbol.toStringTag, { value: "Module" }));
const require$$0$1 = /* @__PURE__ */ main$1.getAugmentedNamespace(main$1.distEs);
const require$$1$2 = /* @__PURE__ */ main$1.getAugmentedNamespace(distEs$d);
const require$$2 = /* @__PURE__ */ main$1.getAugmentedNamespace(distEs$c);
const require$$3$1 = /* @__PURE__ */ main$1.getAugmentedNamespace(distEs$9);
const require$$4$1 = /* @__PURE__ */ main$1.getAugmentedNamespace(distEs$8);
const require$$7$1 = /* @__PURE__ */ main$1.getAugmentedNamespace(main$1.distEs$1);
const require$$8$1 = /* @__PURE__ */ main$1.getAugmentedNamespace(distEs$6);
const require$$9$1 = /* @__PURE__ */ main$1.getAugmentedNamespace(distEs$4);
const name = "@aws-sdk/nested-clients";
const version = "3.940.0";
const description = "Nested clients for AWS SDK packages.";
const main = "./dist-cjs/index.js";
const module$1 = "./dist-es/index.js";
const types = "./dist-types/index.d.ts";
const scripts = { "build": "yarn lint && concurrently 'yarn:build:cjs' 'yarn:build:es' 'yarn:build:types'", "build:cjs": "node ../../scripts/compilation/inline nested-clients", "build:es": "tsc -p tsconfig.es.json", "build:include:deps": "lerna run --scope $npm_package_name --include-dependencies build", "build:types": "tsc -p tsconfig.types.json", "build:types:downlevel": "downlevel-dts dist-types dist-types/ts3.4", "clean": "rimraf ./dist-* && rimraf *.tsbuildinfo", "lint": "node ../../scripts/validation/submodules-linter.js --pkg nested-clients", "test": "yarn g:vitest run", "test:watch": "yarn g:vitest watch" };
const engines = { "node": ">=18.0.0" };
const sideEffects = false;
const author = { "name": "AWS SDK for JavaScript Team", "url": "https://aws.amazon.com/javascript/" };
const license = "Apache-2.0";
const dependencies = { "@aws-crypto/sha256-browser": "5.2.0", "@aws-crypto/sha256-js": "5.2.0", "@aws-sdk/core": "3.940.0", "@aws-sdk/middleware-host-header": "3.936.0", "@aws-sdk/middleware-logger": "3.936.0", "@aws-sdk/middleware-recursion-detection": "3.936.0", "@aws-sdk/middleware-user-agent": "3.940.0", "@aws-sdk/region-config-resolver": "3.936.0", "@aws-sdk/types": "3.936.0", "@aws-sdk/util-endpoints": "3.936.0", "@aws-sdk/util-user-agent-browser": "3.936.0", "@aws-sdk/util-user-agent-node": "3.940.0", "@smithy/config-resolver": "^4.4.3", "@smithy/core": "^3.18.5", "@smithy/fetch-http-handler": "^5.3.6", "@smithy/hash-node": "^4.2.5", "@smithy/invalid-dependency": "^4.2.5", "@smithy/middleware-content-length": "^4.2.5", "@smithy/middleware-endpoint": "^4.3.12", "@smithy/middleware-retry": "^4.4.12", "@smithy/middleware-serde": "^4.2.6", "@smithy/middleware-stack": "^4.2.5", "@smithy/node-config-provider": "^4.3.5", "@smithy/node-http-handler": "^4.4.5", "@smithy/protocol-http": "^5.3.5", "@smithy/smithy-client": "^4.9.8", "@smithy/types": "^4.9.0", "@smithy/url-parser": "^4.2.5", "@smithy/util-base64": "^4.3.0", "@smithy/util-body-length-browser": "^4.2.0", "@smithy/util-body-length-node": "^4.2.1", "@smithy/util-defaults-mode-browser": "^4.3.11", "@smithy/util-defaults-mode-node": "^4.2.14", "@smithy/util-endpoints": "^3.2.5", "@smithy/util-middleware": "^4.2.5", "@smithy/util-retry": "^4.2.5", "@smithy/util-utf8": "^4.2.0", "tslib": "^2.6.2" };
const devDependencies = { "concurrently": "7.0.0", "downlevel-dts": "0.10.1", "rimraf": "3.0.2", "typescript": "~5.8.3" };
const typesVersions = { "<4.0": { "dist-types/*": ["dist-types/ts3.4/*"] } };
const files = ["./signin.d.ts", "./signin.js", "./sso-oidc.d.ts", "./sso-oidc.js", "./sts.d.ts", "./sts.js", "dist-*/**"];
const browser = { "./dist-es/submodules/signin/runtimeConfig": "./dist-es/submodules/signin/runtimeConfig.browser", "./dist-es/submodules/sso-oidc/runtimeConfig": "./dist-es/submodules/sso-oidc/runtimeConfig.browser", "./dist-es/submodules/sts/runtimeConfig": "./dist-es/submodules/sts/runtimeConfig.browser" };
const homepage = "https://github.com/aws/aws-sdk-js-v3/tree/main/packages/nested-clients";
const repository = { "type": "git", "url": "https://github.com/aws/aws-sdk-js-v3.git", "directory": "packages/nested-clients" };
const exports$1 = { "./package.json": "./package.json", "./sso-oidc": { "types": "./dist-types/submodules/sso-oidc/index.d.ts", "module": "./dist-es/submodules/sso-oidc/index.js", "node": "./dist-cjs/submodules/sso-oidc/index.js", "import": "./dist-es/submodules/sso-oidc/index.js", "require": "./dist-cjs/submodules/sso-oidc/index.js" }, "./sts": { "types": "./dist-types/submodules/sts/index.d.ts", "module": "./dist-es/submodules/sts/index.js", "node": "./dist-cjs/submodules/sts/index.js", "import": "./dist-es/submodules/sts/index.js", "require": "./dist-cjs/submodules/sts/index.js" }, "./signin": { "types": "./dist-types/submodules/signin/index.d.ts", "module": "./dist-es/submodules/signin/index.js", "node": "./dist-cjs/submodules/signin/index.js", "import": "./dist-es/submodules/signin/index.js", "require": "./dist-cjs/submodules/signin/index.js" } };
const require$$1$1 = {
  name,
  version,
  description,
  main,
  module: module$1,
  types,
  scripts,
  engines,
  sideEffects,
  author,
  license,
  dependencies,
  devDependencies,
  typesVersions,
  files,
  browser,
  "react-native": {},
  homepage,
  repository,
  exports: exports$1
};
const require$$3 = /* @__PURE__ */ main$1.getAugmentedNamespace(distEs$3);
const require$$5 = /* @__PURE__ */ main$1.getAugmentedNamespace(main$1.distEs$2);
const require$$7 = /* @__PURE__ */ main$1.getAugmentedNamespace(distEs$7);
const require$$8 = /* @__PURE__ */ main$1.getAugmentedNamespace(distEs$e);
const require$$9 = /* @__PURE__ */ main$1.getAugmentedNamespace(distEs$2);
const require$$10 = /* @__PURE__ */ main$1.getAugmentedNamespace(distEs$5);
const require$$4 = /* @__PURE__ */ main$1.getAugmentedNamespace(main$1.distEs$3);
const require$$0 = /* @__PURE__ */ main$1.getAugmentedNamespace(distEs$a);
const require$$1 = /* @__PURE__ */ main$1.getAugmentedNamespace(distEs$b);
const require$$13$1 = /* @__PURE__ */ main$1.getAugmentedNamespace(distEs$1);
const require$$13 = /* @__PURE__ */ main$1.getAugmentedNamespace(distEs);
exports.require$$0 = require$$0;
exports.require$$0$1 = require$$0$1;
exports.require$$1 = require$$1;
exports.require$$1$1 = require$$1$1;
exports.require$$1$2 = require$$1$2;
exports.require$$10 = require$$10;
exports.require$$13 = require$$13$1;
exports.require$$13$1 = require$$13;
exports.require$$2 = require$$2;
exports.require$$3 = require$$3;
exports.require$$3$1 = require$$3$1;
exports.require$$4 = require$$4;
exports.require$$4$1 = require$$4$1;
exports.require$$5 = require$$5;
exports.require$$7 = require$$7;
exports.require$$7$1 = require$$7$1;
exports.require$$8 = require$$8;
exports.require$$8$1 = require$$8$1;
exports.require$$9 = require$$9;
exports.require$$9$1 = require$$9$1;
