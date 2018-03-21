import tl = require('vsts-task-lib/task');
import vsts = require('vso-node-api');
import * as ba from 'vso-node-api/BuildApi';
import * as bi from 'vso-node-api/interfaces/BuildInterfaces';
import * as httpm from 'typed-rest-client/HttpClient';
import ifm from 'typed-rest-client/Interfaces';

async function run() {
    // Retrieve build parameters and environment variables
    const serverUrl: string = tl.getInput('serverUrl', true);
    const projectName: string = tl.getInput('projectName', true);
    const accessToken: string = tl.getInput('accessToken', true);
    const maxChanges: string = tl.getInput('maxChanges', false);
    const personnalAccessToken: string = tl.getInput('personnalAccessToken', false);
    
    // Retrieve environment variables
    const buildID: number = +tl.getVariable('build.buildId');
    const releaseId: number = +tl.getVariable('release.releaseId');
    const collectionUrl: string = tl.getVariable('system.teamFoundationCollectionUri');
    const teamProject: string = tl.getVariable('system.teamProject');

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
    let token: string;
    if (personnalAccessToken) {
        token = personnalAccessToken;
        tl.debug('[icescrum] vsts API will use user provided PAT');
    } else {
        let auth: tl.EndpointAuthorization = tl.getEndpointAuthorization("SYSTEMVSSCONNECTION", false);
        token = auth.parameters["AccessToken"];
        tl.debug('[icescrum] vsts API will use system PAT');
    }
    let authHandler = vsts.getPersonalAccessTokenHandler(token);

    // Get build and chandes info from VSTS API
    let connection = new vsts.WebApi(collectionUrl, authHandler);
    let vstsBuild: ba.IBuildApi = await connection.getBuildApi();
    let build: bi.Build = await vstsBuild.getBuild(buildID, teamProject);
    let changes: bi.Change[] = await vstsBuild.getBuildChanges(teamProject, buildID); // Todo: use max changes ?

    // Parse iceScrum tasks references in commits/changeset
    let regexp: RegExp = /T(\d+)[^0-9]/g
    let corresp;
    let tasks: number[] = []
    changes.forEach((change: bi.Change) => {
        tl.debug('[icescrum] include commits/changeset: ' + change.id + 'with message: ' + change.message);
        while ((corresp = regexp.exec(change.message)) !== null) {
            tasks.push(+corresp[1]);
        }
    });
    if (tasks.length > 0) {
        tl.debug('[icescrum] found tasks: ' + tasks)
    } else {
        tl.debug('[icescrum] no tasks in build associated commits / changeset')
    }

    // Format build info for iceScrum
    let builds: any = {
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
    }

    // Post build info to iceScrum
    const projectUrl = serverUrl + '/ws/project/' + projectName + '/build/vsts';
    tl.debug('[icescrum] post to icescrum url: ' + projectUrl);
    tl.debug('[icescrum] post to icescrum data: ' + JSON.stringify(builds));
    let _http: httpm.HttpClient = new httpm.HttpClient('icescrum-http-client');
    let requestHeaders: any = {
        'x-icescrum-token': accessToken,
        'Content-Type': 'application/json'
    }
    let res: httpm.HttpClientResponse = await _http.post(projectUrl, JSON.stringify(builds), requestHeaders);
    let body: string = await res.readBody();
    if ((res.message.statusCode !== 200) && (res.message.statusCode !==201)) {
        tl.error('[icescrum] post response status code is: ' + res.message.statusCode);
        tl.error('[icescrum] post response status message: ' + res.message.statusMessage);
        tl.error('[icescrum] post response body: ' + body);
    } else {
        tl.debug('[icescrum] post response status ' + res.message.statusCode + ' - ' + res.message.statusMessage)
    }
}

run();