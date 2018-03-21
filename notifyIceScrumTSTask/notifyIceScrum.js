"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
}
Object.defineProperty(exports, "__esModule", { value: true });
const tl = require("vsts-task-lib/task");
const vsts = require("vso-node-api");
const httpm = __importStar(require("typed-rest-client/HttpClient"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        // Retrieve build parameters and environment variables
        const serverUrl = tl.getInput('serverUrl', true);
        const projectName = tl.getInput('projectName', true);
        const accessToken = tl.getInput('accessToken', true);
        const maxChanges = tl.getInput('maxChanges', false);
        const personnalAccessToken = tl.getInput('personnalAccessToken', false);
        // Retrieve environment variables
        const buildID = +tl.getVariable('build.buildId');
        const releaseId = +tl.getVariable('release.releaseId');
        const collectionUrl = tl.getVariable('system.teamFoundationCollectionUri');
        const teamProject = tl.getVariable('system.teamProject');
        tl.debug('[input] serverUrl: ' + serverUrl);
        tl.debug('[input] projectName: ' + projectName);
        tl.debug('[input] accessToken: ' + accessToken);
        tl.debug('[input] maxChanges: ' + maxChanges);
        tl.debug('[input] personnalAccessToken: ' + personnalAccessToken);
        tl.debug('[input] buildID: ' + buildID);
        tl.debug('[input] releaseId: ' + releaseId);
        tl.debug('[input] collectionUrl: ' + collectionUrl);
        tl.debug('[input] teamProject: ' + teamProject);
        tl.debug('[input] getVariables: ' + JSON.stringify(tl.getVariables()));
        // Prepare authentication with PAT
        let token;
        if (personnalAccessToken) {
            token = personnalAccessToken;
            tl.debug('[icescrum] vsts API will use user provided PAT');
        }
        else {
            let auth = tl.getEndpointAuthorization("SYSTEMVSSCONNECTION", false);
            token = auth.parameters["AccessToken"];
            tl.debug('[icescrum] vsts API will use system PAT');
        }
        let authHandler = vsts.getPersonalAccessTokenHandler(token);
        // Get build and chandes info from VSTS API
        let connection = new vsts.WebApi(collectionUrl, authHandler);
        let vstsBuild = yield connection.getBuildApi();
        let build = yield vstsBuild.getBuild(buildID, teamProject);
        let changes = yield vstsBuild.getBuildChanges(teamProject, buildID); // Todo: use max changes ?
        // Parse iceScrum tasks references in commits/changeset
        let regexp = /T(\d+)([^0-9]|$)/g;
        let corresp;
        let tasks = [];
        changes.forEach((change) => {
            tl.debug('[icescrum] include commits/changeset: ' + change.id + 'with message: ' + change.message);
            while ((corresp = regexp.exec(change.message)) !== null) {
                tasks.push(+corresp[1]);
            }
        });
        if (tasks.length > 0) {
            tl.debug('[icescrum] found tasks: ' + tasks);
        }
        else {
            tl.debug('[icescrum] no tasks in build associated commits / changeset');
        }
        // Format build info for iceScrum
        let builds = {
            build: {
                'builtOn': 'vsts',
                'date': build.startTime,
                'jobName': build.definition.name,
                'name': build.definition.name,
                'number': buildID,
                'status': build.result,
                'tasks': tasks,
                'url': build._links.web.href
            }
        };
        // Post build info to iceScrum
        const projectUrl = serverUrl + '/ws/project/' + projectName + '/build/vsts';
        tl.debug('[icescrum] post to icescrum url: ' + projectUrl);
        tl.debug('[icescrum] post to icescrum data: ' + JSON.stringify(builds));
        let _http = new httpm.HttpClient('icescrum-http-client');
        let requestHeaders = {
            'x-icescrum-token': accessToken,
            'Content-Type': 'application/json'
        };
        let res = yield _http.post(projectUrl, JSON.stringify(builds), requestHeaders);
        let body = yield res.readBody();
        if ((res.message.statusCode !== 200) && (res.message.statusCode !== 201)) {
            tl.error('[icescrum] post response status code is: ' + res.message.statusCode);
            tl.error('[icescrum] post response status message: ' + res.message.statusMessage);
            tl.error('[icescrum] post response body: ' + body);
        }
        else {
            tl.debug('[icescrum] post response status ' + res.message.statusCode + ' - ' + res.message.statusMessage);
        }
    });
}
run();
