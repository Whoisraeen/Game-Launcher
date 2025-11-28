"use strict";
class NoAuthSigner {
  async sign(httpRequest, identity, signingProperties) {
    return httpRequest;
  }
}
exports.NoAuthSigner = NoAuthSigner;
