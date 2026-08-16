$ErrorActionPreference = 'Stop'

$repoUrl = 'https://github.com/chrisgoodings-dev/healerlab.git'

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'Git is not installed or is not available on PATH. Install Git for Windows, then run this script again.'
}

Set-Location $PSScriptRoot

if (-not (Test-Path '.git')) {
    git init
    if ($LASTEXITCODE -ne 0) { throw 'git init failed.' }
}

git branch -M main
if ($LASTEXITCODE -ne 0) { throw 'Could not set the local branch to main.' }

# Do not call `git remote get-url origin` when origin may not exist: PowerShell can
# treat Git's stderr output as a terminating error. Query the list of remotes first.
$remotes = @(git remote)
if ($remotes -contains 'origin') {
    git remote set-url origin $repoUrl
    if ($LASTEXITCODE -ne 0) { throw 'Could not update the origin remote.' }
} else {
    git remote add origin $repoUrl
    if ($LASTEXITCODE -ne 0) { throw 'Could not add the origin remote.' }
}

git add .
if ($LASTEXITCODE -ne 0) { throw 'git add failed.' }

# `git status --porcelain` works both before and after the first commit.
$changes = @(git status --porcelain)
if ($changes.Count -gt 0) {
    git commit -m 'Publish HealerLab MVP'

    if ($LASTEXITCODE -ne 0) {
        throw 'Git could not create the commit. If it reports that your identity is unknown, run: git config --global user.name "Your Name" and git config --global user.email "you@example.com", then rerun this script.'
    }
} else {
    Write-Host 'No uncommitted changes were found. Continuing to push the existing main branch.' -ForegroundColor Yellow
}

git push -u origin main
if ($LASTEXITCODE -ne 0) {
    throw 'The GitHub push failed. Check the Git message above for authentication or remote errors.'
}

Write-Host ''
Write-Host 'HealerLab has been pushed to GitHub:' -ForegroundColor Green
Write-Host 'https://github.com/chrisgoodings-dev/healerlab'
