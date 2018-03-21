tsc
# simulate inputs
export INPUT_SERVERURL="http://localhost:8080/icescrum"
export INPUT_PROJECTNAME="PETA"
export INPUT_ACCESSTOKEN="cee81337d3df43fcb323c141acc8e206"
export INPUT_PERSONNALACCESSTOKEN="abh7pnnjm7mzva5b7olv4dsuhcuqleua6avysmgipfc4sn53uy3q" # revoked
# simulate env variables
export BUILD_BUILDID="17"
export SYSTEM_TEAMPROJECT="MyFirstProject-CI"
export SYSTEM_TEAMFOUNDATIONCOLLECTIONURI="https://freestylecoco.visualstudio.com/"
# run task
node ./notifyIceScrumTSTask/notifyIceScrum.js
