"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = linkAdminAuth;
var utils_1 = require("@medusajs/framework/utils");
var core_flows_1 = require("@medusajs/medusa/core-flows");
function linkAdminAuth(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var logger, remoteLink, query, users, user, authIdentities, authIdentity, targetAuthIdentity, linkResult, existingLink, newAuthIdentity;
        var _c, _d, _e, _f;
        var container = _b.container;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    logger = container.resolve(utils_1.ContainerRegistrationKeys.LOGGER);
                    remoteLink = container.resolve(utils_1.ContainerRegistrationKeys.REMOTE_LINK);
                    query = container.resolve(utils_1.ContainerRegistrationKeys.QUERY);
                    logger.info("Linking admin auth identity to user...");
                    return [4 /*yield*/, query.graph({
                            entity: "user",
                            fields: ["id", "email"],
                            filters: {
                                email: "admin@lumiera.com",
                            },
                        })];
                case 1:
                    users = (_g.sent()).data;
                    if (users.length === 0) {
                        logger.error("Admin user not found!");
                        return [2 /*return*/];
                    }
                    user = users[0];
                    logger.info("Found user: ".concat(user.email, " (ID: ").concat(user.id, ")"));
                    return [4 /*yield*/, query.graph({
                            entity: "auth_identity",
                            fields: ["id", "provider_identities"],
                        })];
                case 2:
                    authIdentities = (_g.sent()).data;
                    targetAuthIdentity = authIdentities.find(function (auth) { var _a, _b; return ((_b = (_a = auth.provider_identities) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.email) === "admin@lumiera.com"; });
                    if (!targetAuthIdentity) return [3 /*break*/, 8];
                    logger.info("Found existing auth identity: ".concat(targetAuthIdentity.id));
                    authIdentity = targetAuthIdentity;
                    if (!authIdentity) {
                        logger.error("Auth identity not found for admin@lumiera.com");
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, remoteLink.getLinks((_c = {},
                            _c[utils_1.ContainerRegistrationKeys.AUTH_MODULE] = {
                                auth_identity_id: authIdentity.id,
                            },
                            _c))];
                case 3:
                    linkResult = _g.sent();
                    if (!(linkResult.length > 0)) return [3 /*break*/, 6];
                    logger.info("Auth identity already linked to a user");
                    logger.info("Checking if it's linked to the correct user...");
                    existingLink = linkResult[0];
                    if (!(existingLink.user_id === user.id)) return [3 /*break*/, 4];
                    logger.info("✓ Auth identity already linked to admin user!");
                    logger.info("\n" + "=".repeat(50));
                    logger.info("Admin Login Credentials:");
                    logger.info("=".repeat(50));
                    logger.info("Email: admin@lumiera.com");
                    logger.info("Password: AdminPassword123");
                    logger.info("Admin URL: http://localhost:9000/app");
                    logger.info("=".repeat(50));
                    return [2 /*return*/];
                case 4:
                    logger.info("Auth identity is linked to a different user. Re-linking...");
                    return [4 /*yield*/, remoteLink.dismiss((_d = {},
                            _d[utils_1.ContainerRegistrationKeys.AUTH_MODULE] = {
                                auth_identity_id: authIdentity.id,
                            },
                            _d))];
                case 5:
                    _g.sent();
                    _g.label = 6;
                case 6:
                    logger.info("Linking auth identity to user...");
                    return [4 /*yield*/, remoteLink.create((_e = {},
                            _e[utils_1.ContainerRegistrationKeys.AUTH_MODULE] = {
                                auth_identity_id: authIdentity.id,
                            },
                            _e[utils_1.ContainerRegistrationKeys.USER_MODULE] = {
                                user_id: user.id,
                            },
                            _e))];
                case 7:
                    _g.sent();
                    logger.info("✓ Auth identity linked to user!");
                    return [3 /*break*/, 11];
                case 8:
                    logger.info("Creating new auth identity...");
                    return [4 /*yield*/, (0, core_flows_1.createAuthIdentitiesWorkflow)(container).run({
                            input: {
                                auth_identities: [
                                    {
                                        provider_id: "emailpass",
                                        user_metadata: {
                                            email: "admin@lumiera.com",
                                        },
                                        provider_metadata: {
                                            password: "AdminPassword123",
                                        },
                                    },
                                ],
                            },
                        })];
                case 9:
                    newAuthIdentity = (_g.sent()).result[0];
                    logger.info("Created auth identity: ".concat(newAuthIdentity.id));
                    return [4 /*yield*/, remoteLink.create((_f = {},
                            _f[utils_1.ContainerRegistrationKeys.AUTH_MODULE] = {
                                auth_identity_id: newAuthIdentity.id,
                            },
                            _f[utils_1.ContainerRegistrationKeys.USER_MODULE] = {
                                user_id: user.id,
                            },
                            _f))];
                case 10:
                    _g.sent();
                    logger.info("✓ New auth identity created and linked!");
                    _g.label = 11;
                case 11:
                    logger.info("\n" + "=".repeat(50));
                    logger.info("Admin Login Credentials:");
                    logger.info("=".repeat(50));
                    logger.info("Email: admin@lumiera.com");
                    logger.info("Password: AdminPassword123");
                    logger.info("Admin URL: http://localhost:9000/app");
                    logger.info("=".repeat(50));
                    return [2 /*return*/];
            }
        });
    });
}
