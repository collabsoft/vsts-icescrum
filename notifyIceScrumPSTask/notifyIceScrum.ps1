# freely inspired from: https://github.com/rfennell/vNextBuild
param(
    [string]$projectUrl,
    [string]$accessToken, 
    [int]$maxChanges,
    [bool]$usedefaultcreds
)

Write-Verbose "Entering script notifyIceScrum.ps1"
Write-Verbose "projectUrl = $projectUrl"
Write-Verbose "accessToken = $accessToken" # remove in prod
Write-Verbose "maxChanges = $maxChanges"
Write-Verbose "usedefaultcreds = $usedefaultcreds"

# Get the build and release details
$collectionUrl = $env:SYSTEM_TEAMFOUNDATIONCOLLECTIONURI
$teamproject = $env:SYSTEM_TEAMPROJECT
$releaseid = $env:RELEASE_RELEASEID
$buildid = $env:BUILD_BUILDID
$builddefname = $env:BUILD_DEFINITIONNAME
$buildnumber = $env:BUILD_BUILDNUMBER

Write-Verbose "collectionUrl = [$collectionUrl]"
Write-Verbose "teamproject = [$teamproject]"
Write-Verbose "releaseid = [$releaseid]"
Write-Verbose "buildid = [$buildid]"
Write-Verbose "builddefname = [$builddefname]"
Write-Verbose "buildnumber = [$buildnumber]"

if ( [string]::IsNullOrEmpty($releaseid) -eq $false)
{
    write-Warning "Release mode not handled for now"
} 

Write-Verbose "Getting build details for BuildID [$buildid]"

$build = Get-Build -tfsUri $collectionUrl -teamproject $teamproject -buildid $buildid -usedefaultcreds $usedefaultcreds
Write-Verbose "Found build details [$build]"

$changesets = Get-BuildChangeSets -tfsUri $tfsUri -teamproject $teamproject -buildid $buildid -usedefaultcreds $usedefaultcreds -maxItems $maxChanges
Write-Verbose "Found changesets [$changesets]"

function Get-Build {
    param
    (
        $tfsUri,
        $teamproject,
        $buildid,
        $usedefaultcreds
    )
    $uri = "$($tfsUri)/$($teamproject)/_apis/build/builds/$($buildid)?api-version=2.0"
    $jsondata = Invoke-GetCommand -uri $uri -usedefaultcreds $usedefaultcreds | ConvertFrom-JsonUsingDOTNET
    $jsondata 
}

function Get-BuildChangeSets {
    param
    (
        $tfsUri,
        $teamproject,
        $buildid,
        $usedefaultcreds,
        $maxItems
    )

    Write-Verbose "        Getting up to $($maxItems) associated changesets/commits for build [$($buildid)]"
    $csList = @();

    try { 
        $uri = "$($tfsUri)/$($teamproject)/_apis/build/builds/$($buildid)/changes?api-version=2.0&`$top=$($maxItems)"
        $jsondata = Invoke-GetCommand -uri $uri -usedefaultcreds $usedefaultcreds | ConvertFrom-JsonUsingDOTNET
        foreach ($cs in $jsondata.value) {
            if (!$cs.message) {continue} # skip commits with no description
            # we can get more detail if the changeset is on VSTS or TFS
            try {
                $csList += Get-Detail -uri $cs.location -usedefaultcreds $usedefaultcreds
            }
            catch {
                Write-warning "        Unable to get details of changeset/commit as it is not stored in TFS/VSTS"
                Write-warning "        For [$($cs.id)] location [$($cs.location)]"
                Write-warning "        Just using the details we have from the build"
                $csList += $cs
            }
        }
    }
    catch {
        Write-warning "        Unable to get details of changeset/commit, most likely cause is the build has been deleted"
        Write-warning $_.Exception.Message
    }
    $csList
}

function Invoke-GetCommand {
    [CmdletBinding()]
    param
    (
        $uri,
        $usedefaultcreds
    )

    # When debugging locally, this variable can be set to use personal access token.
    $debugpat = $env:PAT

    $webclient = new-object System.Net.WebClient
    $webclient.Encoding = [System.Text.Encoding]::UTF8
	
    if ([System.Convert]::ToBoolean($usedefaultcreds) -eq $true) {
        Write-Verbose "Using default credentials"
        $webclient.UseDefaultCredentials = $true
    } 
    elseif ([string]::IsNullOrEmpty($debugpat) -eq $false) {
        $encodedPat = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes(":$debugpat"))
        $webclient.Headers.Add("Authorization", "Basic $encodedPat")
    }
    else {
        # Write-Verbose "Using SystemVssConnection personal access token"
        $vssEndPoint = Get-ServiceEndPoint -Name "SystemVssConnection" -Context $distributedTaskContext
        $personalAccessToken = $vssEndpoint.Authorization.Parameters.AccessToken
        $webclient.Headers.Add("Authorization" , "Bearer $personalAccessToken")
    }
		
    #write-verbose "REST Call [$uri]"
    $webclient.DownloadString($uri)
}
