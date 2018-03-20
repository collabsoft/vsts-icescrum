import tl = require('vsts-task-lib/task');
import vsts = require('vso-node-api');
import * as ba from 'vso-node-api/BuildApi';
import * as bi from 'vso-node-api/interfaces/BuildInterfaces';
import * as httpm from 'typed-rest-client/HttpClient';
import ifm from 'typed-rest-client/Interfaces';

async function run() {
    // Retrieve parameters and environment variables
    const serverUrl: string = tl.getInput('serverUrl', true);
    const projectName: string = tl.getInput('projectName', true);
    const accessToken: string = tl.getInput('accessToken', true);
    const maxChanges: string = tl.getInput('maxChanges', false);
    const personnalAccessToken: string = tl.getInput('personnalAccessToken', false);

    // TODO: retrieve from environment
    const buildID: number = 9;
    const releaseId: number | undefined = undefined;
    const collectionUrl: string = "https://freestylecoco.visualstudio.com/defaultcollection";
    const teamProject: string = "MyFirstProject-CI"

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
    let token: string;
    if (personnalAccessToken) {
        token = personnalAccessToken;
        console.log('[icescrum] user provided PAT: ' + token);
    } else {
        let auth: tl.EndpointAuthorization = tl.getEndpointAuthorization("SYSTEMVSSCONNECTION", false);
        token = auth.parameters["AccessToken"];
        console.log('[icescrum] system PAT: ' + token);
    }
    let authHandler = vsts.getPersonalAccessTokenHandler(token);

    // Get build and chandes info from VSTS API
    let connection = new vsts.WebApi(collectionUrl, authHandler);
    let vstsBuild: ba.IBuildApi = await connection.getBuildApi();
    let build: bi.Build = await vstsBuild.getBuild(buildID, teamProject);
    let changes: bi.Change[] = await vstsBuild.getBuildChanges(teamProject, buildID);

    // Parse iceScrum tasks references in commits/changeset
    let regexp: RegExp = /T(\d+)[^0-9]/g
    let corresp;
    let tasks: number[] = []
    changes.forEach((change: bi.Change) => {
        console.log('[icescrum] include commits/changeset: ' + change.id + 'with message: ' + change.message);
        while ((corresp = regexp.exec(change.message)) !== null) {
            tasks.push(+corresp[1]);
        }
    });
    if (tasks.length > 0) {
        console.log('[icescrum] found tasks: ' + tasks)
    } else {
        console.log('[icescrum] no tasks in build associated commits / changeset')
    }

    // Format build info for iceScrum
    let builds: any = {
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
    }

    // Post build info to iceScrum
    const projectUrl = serverUrl + '/ws/project/' + projectName + '/build/vsts';
    console.log('[icescrum] post to icescrum url: ' + projectUrl);
    console.log('[icescrum] post to icescrum data: ' + JSON.stringify(builds));
    let _http: httpm.HttpClient = new httpm.HttpClient('icescrum-http-client');
    let requestHeaders: any = {
        'x-icescrum-token': accessToken,
        'Content-Type': 'application/json'
    }
    let res: httpm.HttpClientResponse = await _http.post(projectUrl, JSON.stringify(builds), requestHeaders);
    console.log('[icescrum] post response status code is: ' + res.message.statusCode);
    console.log('[icescrum] post response status message: ' + res.message.statusMessage);
    let body: string = await res.readBody();
    console.log('[icescrum] post response body: ' + body);
}

run();