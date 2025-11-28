"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const main = require("./main-DiyhksbA.js");
const node_crypto = require("node:crypto");
const require$$4 = require("node:fs");
const node_os = require("node:os");
const sp = require("node:path");
const parseKnownFiles = require("./parseKnownFiles-CgJ6z3G7.js");
const resolveCredentialSource = (credentialSource, profileName, logger) => {
  const sourceProvidersMap = {
    EcsContainer: async (options) => {
      const { fromHttp } = await Promise.resolve().then(() => require("./index-CanqXIMk.js"));
      const { fromContainerMetadata } = await Promise.resolve().then(() => require("./index-BohTX59q.js"));
      logger == null ? void 0 : logger.debug("@aws-sdk/credential-provider-ini - credential_source is EcsContainer");
      return async () => main.chain(fromHttp(options ?? {}), fromContainerMetadata(options))().then(setNamedProvider);
    },
    Ec2InstanceMetadata: async (options) => {
      logger == null ? void 0 : logger.debug("@aws-sdk/credential-provider-ini - credential_source is Ec2InstanceMetadata");
      const { fromInstanceMetadata } = await Promise.resolve().then(() => require("./index-BohTX59q.js"));
      return async () => fromInstanceMetadata(options)().then(setNamedProvider);
    },
    Environment: async (options) => {
      logger == null ? void 0 : logger.debug("@aws-sdk/credential-provider-ini - credential_source is Environment");
      const { fromEnv } = await Promise.resolve().then(() => require("./index-YZFyO3dL.js"));
      return async () => fromEnv(options)().then(setNamedProvider);
    }
  };
  if (credentialSource in sourceProvidersMap) {
    return sourceProvidersMap[credentialSource];
  } else {
    throw new main.CredentialsProviderError(`Unsupported credential source in profile ${profileName}. Got ${credentialSource}, expected EcsContainer or Ec2InstanceMetadata or Environment.`, { logger });
  }
};
const setNamedProvider = (creds) => main.setCredentialFeature(creds, "CREDENTIALS_PROFILE_NAMED_PROVIDER", "p");
const isAssumeRoleProfile = (arg, { profile = "default", logger } = {}) => {
  return Boolean(arg) && typeof arg === "object" && typeof arg.role_arn === "string" && ["undefined", "string"].indexOf(typeof arg.role_session_name) > -1 && ["undefined", "string"].indexOf(typeof arg.external_id) > -1 && ["undefined", "string"].indexOf(typeof arg.mfa_serial) > -1 && (isAssumeRoleWithSourceProfile(arg, { profile, logger }) || isCredentialSourceProfile(arg, { profile, logger }));
};
const isAssumeRoleWithSourceProfile = (arg, { profile, logger }) => {
  var _a;
  const withSourceProfile = typeof arg.source_profile === "string" && typeof arg.credential_source === "undefined";
  if (withSourceProfile) {
    (_a = logger == null ? void 0 : logger.debug) == null ? void 0 : _a.call(logger, `    ${profile} isAssumeRoleWithSourceProfile source_profile=${arg.source_profile}`);
  }
  return withSourceProfile;
};
const isCredentialSourceProfile = (arg, { profile, logger }) => {
  var _a;
  const withProviderProfile = typeof arg.credential_source === "string" && typeof arg.source_profile === "undefined";
  if (withProviderProfile) {
    (_a = logger == null ? void 0 : logger.debug) == null ? void 0 : _a.call(logger, `    ${profile} isCredentialSourceProfile credential_source=${arg.credential_source}`);
  }
  return withProviderProfile;
};
const resolveAssumeRoleCredentials = async (profileName, profiles, options, visitedProfiles = {}, resolveProfileData2) => {
  var _a, _b, _c;
  (_a = options.logger) == null ? void 0 : _a.debug("@aws-sdk/credential-provider-ini - resolveAssumeRoleCredentials (STS)");
  const profileData = profiles[profileName];
  const { source_profile, region } = profileData;
  if (!options.roleAssumer) {
    const { getDefaultRoleAssumer } = await Promise.resolve().then(() => require("./index-DFET1g9C.js"));
    options.roleAssumer = getDefaultRoleAssumer({
      ...options.clientConfig,
      credentialProviderLogger: options.logger,
      parentClientConfig: {
        ...options == null ? void 0 : options.parentClientConfig,
        region: region ?? ((_b = options == null ? void 0 : options.parentClientConfig) == null ? void 0 : _b.region)
      }
    }, options.clientPlugins);
  }
  if (source_profile && source_profile in visitedProfiles) {
    throw new main.CredentialsProviderError(`Detected a cycle attempting to resolve credentials for profile ${main.getProfileName(options)}. Profiles visited: ` + Object.keys(visitedProfiles).join(", "), { logger: options.logger });
  }
  (_c = options.logger) == null ? void 0 : _c.debug(`@aws-sdk/credential-provider-ini - finding credential resolver using ${source_profile ? `source_profile=[${source_profile}]` : `profile=[${profileName}]`}`);
  const sourceCredsProvider = source_profile ? resolveProfileData2(source_profile, profiles, options, {
    ...visitedProfiles,
    [source_profile]: true
  }, isCredentialSourceWithoutRoleArn(profiles[source_profile] ?? {})) : (await resolveCredentialSource(profileData.credential_source, profileName, options.logger)(options))();
  if (isCredentialSourceWithoutRoleArn(profileData)) {
    return sourceCredsProvider.then((creds) => main.setCredentialFeature(creds, "CREDENTIALS_PROFILE_SOURCE_PROFILE", "o"));
  } else {
    const params = {
      RoleArn: profileData.role_arn,
      RoleSessionName: profileData.role_session_name || `aws-sdk-js-${Date.now()}`,
      ExternalId: profileData.external_id,
      DurationSeconds: parseInt(profileData.duration_seconds || "3600", 10)
    };
    const { mfa_serial } = profileData;
    if (mfa_serial) {
      if (!options.mfaCodeProvider) {
        throw new main.CredentialsProviderError(`Profile ${profileName} requires multi-factor authentication, but no MFA code callback was provided.`, { logger: options.logger, tryNextLink: false });
      }
      params.SerialNumber = mfa_serial;
      params.TokenCode = await options.mfaCodeProvider(mfa_serial);
    }
    const sourceCreds = await sourceCredsProvider;
    return options.roleAssumer(sourceCreds, params).then((creds) => main.setCredentialFeature(creds, "CREDENTIALS_PROFILE_SOURCE_PROFILE", "o"));
  }
};
const isCredentialSourceWithoutRoleArn = (section) => {
  return !section.role_arn && !!section.credential_source;
};
const _LoginCredentialsFetcher = class _LoginCredentialsFetcher {
  constructor(profileData, init, callerClientConfig) {
    __publicField(this, "profileData");
    __publicField(this, "init");
    __publicField(this, "callerClientConfig");
    this.profileData = profileData;
    this.init = init;
    this.callerClientConfig = callerClientConfig;
  }
  async loadCredentials() {
    const token = await this.loadToken();
    if (!token) {
      throw new main.CredentialsProviderError(`Failed to load a token for session ${this.loginSession}, please re-authenticate using aws login`, { tryNextLink: false, logger: this.logger });
    }
    const accessToken = token.accessToken;
    const now = Date.now();
    const expiryTime = new Date(accessToken.expiresAt).getTime();
    const timeUntilExpiry = expiryTime - now;
    if (timeUntilExpiry <= _LoginCredentialsFetcher.REFRESH_THRESHOLD) {
      return this.refresh(token);
    }
    return {
      accessKeyId: accessToken.accessKeyId,
      secretAccessKey: accessToken.secretAccessKey,
      sessionToken: accessToken.sessionToken,
      accountId: accessToken.accountId,
      expiration: new Date(accessToken.expiresAt)
    };
  }
  get logger() {
    var _a;
    return (_a = this.init) == null ? void 0 : _a.logger;
  }
  get loginSession() {
    return this.profileData.login_session;
  }
  async refresh(token) {
    var _a, _b, _c, _d, _e, _f;
    const { SigninClient, CreateOAuth2TokenCommand } = await Promise.resolve().then(() => require("./index-B_HIWjMl.js"));
    const { logger, userAgentAppId } = this.callerClientConfig ?? {};
    const isH2 = (requestHandler2) => {
      var _a2;
      return ((_a2 = requestHandler2 == null ? void 0 : requestHandler2.metadata) == null ? void 0 : _a2.handlerProtocol) === "h2";
    };
    const requestHandler = isH2((_a = this.callerClientConfig) == null ? void 0 : _a.requestHandler) ? void 0 : (_b = this.callerClientConfig) == null ? void 0 : _b.requestHandler;
    const region = this.profileData.region ?? await ((_d = (_c = this.callerClientConfig) == null ? void 0 : _c.region) == null ? void 0 : _d.call(_c)) ?? process.env.AWS_REGION;
    const client = new SigninClient({
      credentials: {
        accessKeyId: "",
        secretAccessKey: ""
      },
      region,
      requestHandler,
      logger,
      userAgentAppId,
      ...(_e = this.init) == null ? void 0 : _e.clientConfig
    });
    this.createDPoPInterceptor(client.middlewareStack);
    const commandInput = {
      tokenInput: {
        clientId: token.clientId,
        refreshToken: token.refreshToken,
        grantType: "refresh_token"
      }
    };
    try {
      const response = await client.send(new CreateOAuth2TokenCommand(commandInput));
      const { accessKeyId, secretAccessKey, sessionToken } = ((_f = response.tokenOutput) == null ? void 0 : _f.accessToken) ?? {};
      const { refreshToken, expiresIn } = response.tokenOutput ?? {};
      if (!accessKeyId || !secretAccessKey || !sessionToken || !refreshToken) {
        throw new main.CredentialsProviderError("Token refresh response missing required fields", {
          logger: this.logger,
          tryNextLink: false
        });
      }
      const expiresInMs = (expiresIn ?? 900) * 1e3;
      const expiration = new Date(Date.now() + expiresInMs);
      const updatedToken = {
        ...token,
        accessToken: {
          ...token.accessToken,
          accessKeyId,
          secretAccessKey,
          sessionToken,
          expiresAt: expiration.toISOString()
        },
        refreshToken
      };
      await this.saveToken(updatedToken);
      const newAccessToken = updatedToken.accessToken;
      return {
        accessKeyId: newAccessToken.accessKeyId,
        secretAccessKey: newAccessToken.secretAccessKey,
        sessionToken: newAccessToken.sessionToken,
        accountId: newAccessToken.accountId,
        expiration
      };
    } catch (error) {
      if (error.name === "AccessDeniedException") {
        const errorType = error.error;
        let message;
        switch (errorType) {
          case "TOKEN_EXPIRED":
            message = "Your session has expired. Please reauthenticate.";
            break;
          case "USER_CREDENTIALS_CHANGED":
            message = "Unable to refresh credentials because of a change in your password. Please reauthenticate with your new password.";
            break;
          case "INSUFFICIENT_PERMISSIONS":
            message = "Unable to refresh credentials due to insufficient permissions. You may be missing permission for the 'CreateOAuth2Token' action.";
            break;
          default:
            message = `Failed to refresh token: ${String(error)}. Please re-authenticate using \`aws login\``;
        }
        throw new main.CredentialsProviderError(message, { logger: this.logger, tryNextLink: false });
      }
      throw new main.CredentialsProviderError(`Failed to refresh token: ${String(error)}. Please re-authenticate using aws login`, { logger: this.logger });
    }
  }
  async loadToken() {
    var _a, _b;
    const tokenFilePath = this.getTokenFilePath();
    try {
      let tokenData;
      try {
        tokenData = await main.readFile(tokenFilePath, { ignoreCache: (_a = this.init) == null ? void 0 : _a.ignoreCache });
      } catch {
        tokenData = await require$$4.promises.readFile(tokenFilePath, "utf8");
      }
      const token = JSON.parse(tokenData);
      const missingFields = ["accessToken", "clientId", "refreshToken", "dpopKey"].filter((k) => !token[k]);
      if (!((_b = token.accessToken) == null ? void 0 : _b.accountId)) {
        missingFields.push("accountId");
      }
      if (missingFields.length > 0) {
        throw new main.CredentialsProviderError(`Token validation failed, missing fields: ${missingFields.join(", ")}`, {
          logger: this.logger,
          tryNextLink: false
        });
      }
      return token;
    } catch (error) {
      throw new main.CredentialsProviderError(`Failed to load token from ${tokenFilePath}: ${String(error)}`, {
        logger: this.logger,
        tryNextLink: false
      });
    }
  }
  async saveToken(token) {
    const tokenFilePath = this.getTokenFilePath();
    const directory = sp.dirname(tokenFilePath);
    try {
      await require$$4.promises.mkdir(directory, { recursive: true });
    } catch (error) {
    }
    await require$$4.promises.writeFile(tokenFilePath, JSON.stringify(token, null, 2), "utf8");
  }
  getTokenFilePath() {
    const directory = process.env.AWS_LOGIN_CACHE_DIRECTORY ?? sp.join(node_os.homedir(), ".aws", "login", "cache");
    const loginSessionBytes = Buffer.from(this.loginSession, "utf8");
    const loginSessionSha256 = node_crypto.createHash("sha256").update(loginSessionBytes).digest("hex");
    return sp.join(directory, `${loginSessionSha256}.json`);
  }
  derToRawSignature(derSignature) {
    let offset = 2;
    if (derSignature[offset] !== 2) {
      throw new Error("Invalid DER signature");
    }
    offset++;
    const rLength = derSignature[offset++];
    let r = derSignature.subarray(offset, offset + rLength);
    offset += rLength;
    if (derSignature[offset] !== 2) {
      throw new Error("Invalid DER signature");
    }
    offset++;
    const sLength = derSignature[offset++];
    let s = derSignature.subarray(offset, offset + sLength);
    r = r[0] === 0 ? r.subarray(1) : r;
    s = s[0] === 0 ? s.subarray(1) : s;
    const rPadded = Buffer.concat([Buffer.alloc(32 - r.length), r]);
    const sPadded = Buffer.concat([Buffer.alloc(32 - s.length), s]);
    return Buffer.concat([rPadded, sPadded]);
  }
  createDPoPInterceptor(middlewareStack) {
    middlewareStack.add((next) => async (args) => {
      if (main.HttpRequest.isInstance(args.request)) {
        const request = args.request;
        const actualEndpoint = `${request.protocol}//${request.hostname}${request.port ? `:${request.port}` : ""}${request.path}`;
        const dpop = await this.generateDpop(request.method, actualEndpoint);
        request.headers = {
          ...request.headers,
          DPoP: dpop
        };
      }
      return next(args);
    }, {
      step: "finalizeRequest",
      name: "dpopInterceptor",
      override: true
    });
  }
  async generateDpop(method = "POST", endpoint) {
    const token = await this.loadToken();
    try {
      const privateKey = node_crypto.createPrivateKey({
        key: token.dpopKey,
        format: "pem",
        type: "sec1"
      });
      const publicKey = node_crypto.createPublicKey(privateKey);
      const publicDer = publicKey.export({ format: "der", type: "spki" });
      let pointStart = -1;
      for (let i = 0; i < publicDer.length; i++) {
        if (publicDer[i] === 4) {
          pointStart = i;
          break;
        }
      }
      const x = publicDer.slice(pointStart + 1, pointStart + 33);
      const y = publicDer.slice(pointStart + 33, pointStart + 65);
      const header = {
        alg: "ES256",
        typ: "dpop+jwt",
        jwk: {
          kty: "EC",
          crv: "P-256",
          x: x.toString("base64url"),
          y: y.toString("base64url")
        }
      };
      const payload = {
        jti: crypto.randomUUID(),
        htm: method,
        htu: endpoint,
        iat: Math.floor(Date.now() / 1e3)
      };
      const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
      const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
      const message = `${headerB64}.${payloadB64}`;
      const asn1Signature = node_crypto.sign("sha256", Buffer.from(message), privateKey);
      const rawSignature = this.derToRawSignature(asn1Signature);
      const signatureB64 = rawSignature.toString("base64url");
      return `${message}.${signatureB64}`;
    } catch (error) {
      throw new main.CredentialsProviderError(`Failed to generate Dpop proof: ${error instanceof Error ? error.message : String(error)}`, { logger: this.logger, tryNextLink: false });
    }
  }
};
__publicField(_LoginCredentialsFetcher, "REFRESH_THRESHOLD", 5 * 60 * 1e3);
let LoginCredentialsFetcher = _LoginCredentialsFetcher;
const fromLoginCredentials = (init) => async ({ callerClientConfig } = {}) => {
  var _a, _b;
  (_b = (_a = init == null ? void 0 : init.logger) == null ? void 0 : _a.debug) == null ? void 0 : _b.call(_a, "@aws-sdk/credential-providers - fromLoginCredentials");
  const profiles = await parseKnownFiles.parseKnownFiles(init || {});
  const profileName = main.getProfileName({
    profile: (init == null ? void 0 : init.profile) ?? (callerClientConfig == null ? void 0 : callerClientConfig.profile)
  });
  const profile = profiles[profileName];
  if (!(profile == null ? void 0 : profile.login_session)) {
    throw new main.CredentialsProviderError(`Profile ${profileName} does not contain login_session.`, {
      tryNextLink: true,
      logger: init == null ? void 0 : init.logger
    });
  }
  const fetcher = new LoginCredentialsFetcher(profile, init, callerClientConfig);
  const credentials = await fetcher.loadCredentials();
  return main.setCredentialFeature(credentials, "CREDENTIALS_LOGIN", "AD");
};
const isLoginProfile = (data) => {
  return Boolean(data && data.login_session);
};
const resolveLoginCredentials = async (profileName, options) => {
  const credentials = await fromLoginCredentials({
    ...options,
    profile: profileName
  })();
  return main.setCredentialFeature(credentials, "CREDENTIALS_PROFILE_LOGIN", "AC");
};
const isProcessProfile = (arg) => Boolean(arg) && typeof arg === "object" && typeof arg.credential_process === "string";
const resolveProcessCredentials = async (options, profile) => Promise.resolve().then(() => require("./index-CTsbbpyN.js")).then(({ fromProcess }) => fromProcess({
  ...options,
  profile
})().then((creds) => main.setCredentialFeature(creds, "CREDENTIALS_PROFILE_PROCESS", "v")));
const resolveSsoCredentials = async (profile, profileData, options = {}) => {
  const { fromSSO } = await Promise.resolve().then(() => require("./index-DNE-RwnY.js"));
  return fromSSO({
    profile,
    logger: options.logger,
    parentClientConfig: options.parentClientConfig,
    clientConfig: options.clientConfig
  })().then((creds) => {
    if (profileData.sso_session) {
      return main.setCredentialFeature(creds, "CREDENTIALS_PROFILE_SSO", "r");
    } else {
      return main.setCredentialFeature(creds, "CREDENTIALS_PROFILE_SSO_LEGACY", "t");
    }
  });
};
const isSsoProfile = (arg) => arg && (typeof arg.sso_start_url === "string" || typeof arg.sso_account_id === "string" || typeof arg.sso_session === "string" || typeof arg.sso_region === "string" || typeof arg.sso_role_name === "string");
const isStaticCredsProfile = (arg) => Boolean(arg) && typeof arg === "object" && typeof arg.aws_access_key_id === "string" && typeof arg.aws_secret_access_key === "string" && ["undefined", "string"].indexOf(typeof arg.aws_session_token) > -1 && ["undefined", "string"].indexOf(typeof arg.aws_account_id) > -1;
const resolveStaticCredentials = async (profile, options) => {
  var _a;
  (_a = options == null ? void 0 : options.logger) == null ? void 0 : _a.debug("@aws-sdk/credential-provider-ini - resolveStaticCredentials");
  const credentials = {
    accessKeyId: profile.aws_access_key_id,
    secretAccessKey: profile.aws_secret_access_key,
    sessionToken: profile.aws_session_token,
    ...profile.aws_credential_scope && { credentialScope: profile.aws_credential_scope },
    ...profile.aws_account_id && { accountId: profile.aws_account_id }
  };
  return main.setCredentialFeature(credentials, "CREDENTIALS_PROFILE", "n");
};
const isWebIdentityProfile = (arg) => Boolean(arg) && typeof arg === "object" && typeof arg.web_identity_token_file === "string" && typeof arg.role_arn === "string" && ["undefined", "string"].indexOf(typeof arg.role_session_name) > -1;
const resolveWebIdentityCredentials = async (profile, options) => Promise.resolve().then(() => require("./index-BjIooTiX.js")).then(({ fromTokenFile }) => fromTokenFile({
  webIdentityTokenFile: profile.web_identity_token_file,
  roleArn: profile.role_arn,
  roleSessionName: profile.role_session_name,
  roleAssumerWithWebIdentity: options.roleAssumerWithWebIdentity,
  logger: options.logger,
  parentClientConfig: options.parentClientConfig
})().then((creds) => main.setCredentialFeature(creds, "CREDENTIALS_PROFILE_STS_WEB_ID_TOKEN", "q")));
const resolveProfileData = async (profileName, profiles, options, visitedProfiles = {}, isAssumeRoleRecursiveCall = false) => {
  const data = profiles[profileName];
  if (Object.keys(visitedProfiles).length > 0 && isStaticCredsProfile(data)) {
    return resolveStaticCredentials(data, options);
  }
  if (isAssumeRoleRecursiveCall || isAssumeRoleProfile(data, { profile: profileName, logger: options.logger })) {
    return resolveAssumeRoleCredentials(profileName, profiles, options, visitedProfiles, resolveProfileData);
  }
  if (isStaticCredsProfile(data)) {
    return resolveStaticCredentials(data, options);
  }
  if (isWebIdentityProfile(data)) {
    return resolveWebIdentityCredentials(data, options);
  }
  if (isProcessProfile(data)) {
    return resolveProcessCredentials(options, profileName);
  }
  if (isSsoProfile(data)) {
    return await resolveSsoCredentials(profileName, data, options);
  }
  if (isLoginProfile(data)) {
    return resolveLoginCredentials(profileName, options);
  }
  throw new main.CredentialsProviderError(`Could not resolve credentials using profile: [${profileName}] in configuration/credentials file(s).`, { logger: options.logger });
};
const fromIni = (_init = {}) => async ({ callerClientConfig } = {}) => {
  var _a;
  const init = {
    ..._init,
    parentClientConfig: {
      ...callerClientConfig,
      ..._init.parentClientConfig
    }
  };
  (_a = init.logger) == null ? void 0 : _a.debug("@aws-sdk/credential-provider-ini - fromIni");
  const profiles = await parseKnownFiles.parseKnownFiles(init);
  return resolveProfileData(main.getProfileName({
    profile: _init.profile ?? (callerClientConfig == null ? void 0 : callerClientConfig.profile)
  }), profiles, init);
};
exports.fromIni = fromIni;
