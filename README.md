# vsts-icescrum
iceScrum extension for Visual Studio Team Service.

## prerequisites
First, install typescript globally
```
npm install -g typescript
```
*More info at : [VSTS DevOps Task SDK](https://github.com/Microsoft/vsts-task-lib/blob/master/node/README.md)*

On first setup npm install must be runned from both the project root directory and notifyIceScrumTask directory.
```
npm install
cd notifyIceScrumTask
npm install
```

Then all other commands should be runned from the project root directory.

## test extension
Launch task locally with 
```
npm test
```

## package extension
package vsix extension with vss-web-extension-sdk (auto increment version)
```
npm install
```