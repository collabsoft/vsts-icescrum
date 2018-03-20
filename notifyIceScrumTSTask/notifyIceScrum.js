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
        // Retrieve parameters and environment variables
        const serverUrl = tl.getInput('serverUrl', true);
        const projectName = tl.getInput('projectName', true);
        const accessToken = tl.getInput('accessToken', true);
        const maxChanges = tl.getInput('maxChanges', false);
        const personnalAccessToken = tl.getInput('personnalAccessToken', false);
        // TODO: retrieve from environment
        const buildID = 9;
        const releaseId = undefined;
        const collectionUrl = "https://freestylecoco.visualstudio.com/defaultcollection";
        const teamProject = "MyFirstProject-CI";
        console.log('[input] serverUrl: ' + serverUrl);
        console.log('[input] projectName: ' + projectName);
        console.log('[input] accessToken: ' + accessToken);
        console.log('[input] maxChanges: ' + maxChanges);
        console.log('[input] personnalAccessToken: ' + personnalAccessToken);
        console.log('[input] buildID: ' + buildID);
        console.log('[input] releaseId: ' + releaseId);
        console.log('[input] collectionUrl: ' + collectionUrl);
        console.log('[input] teamProject: ' + teamProject);
        console.log('[input] getVariables: ' + tl.getVariables().toString());
        // Prepare authentication with PAT
        let token;
        if (personnalAccessToken) {
            token = personnalAccessToken;
            console.log('[icescrum] user provided PAT: ' + token);
        }
        else {
            let auth = tl.getEndpointAuthorization("SYSTEMVSSCONNECTION", false);
            token = auth.parameters["AccessToken"];
            console.log('[icescrum] system PAT: ' + token);
        }
        let authHandler = vsts.getPersonalAccessTokenHandler(token);
        // Get build and chandes info from VSTS API
        let connection = new vsts.WebApi(collectionUrl, authHandler);
        let vstsBuild = yield connection.getBuildApi();
        let build = yield vstsBuild.getBuild(buildID, teamProject);
        let changes = yield vstsBuild.getBuildChanges(teamProject, buildID);
        // Parse iceScrum tasks references in commits/changeset
        let regexp = /T(\d+)[^0-9]/g;
        let corresp;
        let tasks = [];
        changes.forEach((change) => {
            console.log('[icescrum] include commits/changeset: ' + change.id + 'with message: ' + change.message);
            while ((corresp = regexp.exec(change.message)) !== null) {
                tasks.push(+corresp[1]);
            }
        });
        if (tasks.length > 0) {
            console.log('[icescrum] found tasks: ' + tasks);
        }
        else {
            console.log('[icescrum] no tasks in build associated commits / changeset');
        }
        // Format build info for iceScrum
        let builds = {
            build: {
                'builtOn': 'vsts',
                'date': build.startTime,
                'jobName': build.definition.name,
                'name': build.definition.name,
                'number': buildID,
                'result': build.result,
                'tasks': tasks,
                'url': build._links.web.href
            }
        };
        // Post build info to iceScrum
        const projectUrl = serverUrl + '/ws/project/' + projectName + '/build/vsts';
        console.log('[icescrum] post to icescrum url: ' + projectUrl);
        console.log('[icescrum] post to icescrum data: ' + JSON.stringify(builds));
        let _http = new httpm.HttpClient('icescrum-http-client');
        let requestHeaders = {
            'x-icescrum-token': accessToken,
            'Content-Type': 'application/json'
        };
        let res = yield _http.post(projectUrl, JSON.stringify(builds), requestHeaders);
        console.log('[icescrum] post response status code is: ' + res.message.statusCode);
        console.log('[icescrum] post response status message: ' + res.message.statusMessage);
        let body = yield res.readBody();
        console.log('[icescrum] post response body: ' + body);
    });
}
run();
