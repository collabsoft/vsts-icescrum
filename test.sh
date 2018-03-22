tsc
# simulate inputs
export INPUT_PROJECTURL="http://localhost:8080/icescrum/p/PETA/"
export INPUT_ACCESSTOKEN="cee81337d3df43fcb323c141acc8e206"
export INPUT_PERSONNALACCESSTOKEN="tacbqhzye4o55gyc7e2ho7fd7b56l4jryya2dtysxdsbyfud4cja" # revoked
# simulate env variables
export BUILD_BUILDID="17"
export SYSTEM_TEAMPROJECT="MyFirstProject-CI"
export SYSTEM_TEAMFOUNDATIONCOLLECTIONURI="https://freestylecoco.visualstudio.com/"
# run task
node ./notifyIceScrumTask/notifyIceScrum.js
