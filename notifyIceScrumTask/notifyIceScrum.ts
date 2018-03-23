import tl = require('vsts-task-lib/task');
import vsts = require('vso-node-api');
import * as ba from 'vso-node-api/BuildApi';
import * as bi from 'vso-node-api/interfaces/BuildInterfaces';
import * as httpm from 'typed-rest-client/HttpClient';
import ifm from 'typed-rest-client/Interfaces';

async function run() {
    // Retrieve build parameters and environment variables
    let projectUrl: string = tl.getInput('projectUrl', true);

    // Retrieve environment variables
    const accessToken: string = tl.getVariable('icescrum.accessToken');
    const personnalAccessToken: string = tl.getVariable('test.personnalAccessToken');
    const buildID: number = +tl.getVariable('build.buildId');
    const releaseId: number = +tl.getVariable('release.releaseId');
    const collectionUrl: string = tl.getVariable('system.teamFoundationCollectionUri');
    const teamProject: string = tl.getVariable('system.teamProject');
    const jobStatus: string = tl.getVariable('agent.jobstatus');

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

    // Make sur iceScrum access token is available
    if(!accessToken){
        tl.setResult(tl.TaskResult.Failed, `iceScrum access token not provided in build variable "icescrum.accessToken"`);
    }

    // Get build and chandes info from VSTS API
    let connection = new vsts.WebApi(collectionUrl, authHandler);
    let vstsBuild: ba.IBuildApi = await connection.getBuildApi();
    let build: bi.Build = await vstsBuild.getBuild(buildID, teamProject);
    let changes: bi.Change[] = await vstsBuild.getBuildChanges(teamProject, buildID);

    // Parse iceScrum tasks references in commits/changeset
    let taskRegexp: RegExp = /T(\d+)([^0-9]|$)/g
    let corresp;
    let tasks: number[] = []
    changes.forEach((change: bi.Change) => {
        tl.debug('[icescrum] include commits/changeset: ' + change.id + 'with message: ' + change.message);
        while ((corresp = taskRegexp.exec(change.message)) !== null) {
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
            'status': jobStatus,
            'tasks': tasks,
            'url': build._links.web.href
        }
    }

    // compute iceScrum REST API url from input params
    let projectName;
    let serverUrl;
    let projectUrlRegexp: RegExp = /^((http|https):\/\/.+)\/p\/([0-9A-Z]*)/
    if ((corresp = projectUrlRegexp.exec(projectUrl)) !== null) {
        serverUrl = corresp[1];
        projectName = corresp[3];
    } else {
        tl.error(`[icescrum] Invalid input string for projectUrl parameter: ${projectUrl}`);
        tl.error(`[icescrum] projectUrl is expected to match /^((http|https):\/\/.+)\/p\/([0-9A-Z]*)/`);
        tl.setResult(tl.TaskResult.Failed, 'Invalid input string for Project URL parameter.');
    }
    tl.debug('[icescrum] serverUrl: ' + serverUrl);
    tl.debug('[icescrum] projectName: ' + projectName);
    const postUrl = serverUrl + '/ws/project/' + projectName + '/build/vsts';

    // Post build info to iceScrum
    tl.debug('[icescrum] post to icescrum url: ' + postUrl);
    tl.debug('[icescrum] post to icescrum data: ' + JSON.stringify(builds));
    let _http: httpm.HttpClient = new httpm.HttpClient('icescrum-http-client');
    let requestHeaders: any = {
        'x-icescrum-token': accessToken,
        'Content-Type': 'application/json'
    }
    let res: httpm.HttpClientResponse = await _http.post(postUrl, JSON.stringify(builds), requestHeaders);
    let body: string = await res.readBody();
    if (res.message.statusCode === 503) {
        tl.error('[icescrum] post response status code is: ' + res.message.statusCode);
        tl.error('[icescrum] post response status message: ' + res.message.statusMessage);
        tl.error('[icescrum] post response body: ' + body);
        tl.setResult(tl.TaskResult.Failed, 'Failed to notify build status to iceScrum: make sure the VSTS-CI app is enabled on your iceScrum project.');
    } else if ((res.message.statusCode !== 200) && (res.message.statusCode !== 201)) {
        tl.error('[icescrum] post response status code is: ' + res.message.statusCode);
        tl.error('[icescrum] post response status message: ' + res.message.statusMessage);
        tl.error('[icescrum] post response body: ' + body);
        tl.setResult(tl.TaskResult.Failed, 'Failed to notify build status to iceScrum: ' + res.message.statusMessage);
    } else {
        tl.debug('[icescrum] post response status ' + res.message.statusCode + ' - ' + res.message.statusMessage)
    }
}

run();