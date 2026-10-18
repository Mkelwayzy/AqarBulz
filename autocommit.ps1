while ($true) {
    $status = git status --porcelain
    if ($status) {
        git add .
        git commit -m "Auto commit: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        git push
    }
    Start-Sleep -Seconds 5
}