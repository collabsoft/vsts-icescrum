import tl = require('vsts-task-lib/task');
import api = require('vso-node-api');

async function run() {
    let projectUrl: string = tl.getInput('projectUrl', true);
    let accessToken: string = tl.getInput('accessToken', true);
    let maxChanges: string = tl.getInput('maxChanges');

    console.log('[input] projectUrl: ' + projectUrl);
    console.log('[input] accessToken: ' + accessToken);
    console.log('[input] maxChanges: ' + maxChanges);
}

run();