# vsts-icescrum
iceScrum extension for Visual Studio Team Service.

## prerequisites
First, install typescript and tfx CLI globally
```
npm install -g typescript
npm i -g tfx-cli
```
*More info at : [VSTS DevOps Task SDK](https://github.com/Microsoft/vsts-task-lib/blob/master/node/README.md)*

On first setup npm install must be runned from both the project root directory and notifyIceScrumTask directory.
```
npm install
cd notifyIceScrumTask
npm install
```

Then all other commands should be runned from the project root directory.

## test extension locally
Create a 'PAT.txt' file in root directory containing the Personnal Access Token to use for test
Eventually edit 'test.sh' to edit other test parameters.
Then Launch task locally with: 
```
npm test
```

## package extension
package vsix extension with vss-web-extension-sdk (auto increment version)
```
npm run build
```