# simulate inputs
export INPUT_PROJECTURL="http://localhost:8080/icescrum/p/PETA/"
export ICESCRUM_ACCESSTOKEN="cee81337d3df43fcb323c141acc8e206"
export TEST_PERSONNALACCESSTOKEN=$(cat PAT.txt)
# simulate env variables
export BUILD_BUILDID="17"
export SYSTEM_TEAMPROJECT="MyFirstProject-CI"
export SYSTEM_TEAMFOUNDATIONCOLLECTIONURI="https://freestylecoco.visualstudio.com/"
# run task
node ./notifyIceScrumTask/notifyIceScrum.js
