# Assemble data/*.json into questions.js (SUBJECTS + QUESTIONS globals).
# PowerShell port of assemble-questions.js for machines without Node.
# Run from repo root:  powershell -ExecutionPolicy Bypass -File scripts\assemble-questions.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Load-Json($path) {
  $raw = [IO.File]::ReadAllText((Join-Path $root $path), [Text.Encoding]::UTF8)
  $data = ConvertFrom-Json $raw
  # PS5.1: ConvertFrom-Json wraps arrays in a PSObject; foreach unwraps reliably.
  $list = New-Object System.Collections.Generic.List[object]
  foreach ($x in $data) { [void]$list.Add($x) }
  $list.ToArray()
}

function Load-Parts($prefix) {
  @(Load-Json "data/$prefix-part1.json") + @(Load-Json "data/$prefix-part2.json")
}

$QUESTIONS = [ordered]@{
  "medical-law"        = @(Load-Json "data/medical-law.json")
  "public-health"      = @(Load-Json "data/public-health.json")
  "anatomy"            = @(Load-Json "data/anatomy.json")
  "histopathology"     = @(Load-Json "data/histopathology-existing.json") + @(Load-Parts "hp")
  "physiology"         = @(Load-Parts "ph")
  "clinical-chemistry" = @(Load-Parts "cc")
  "hematology"         = @(Load-Parts "he")
  "immuno-transfusion" = @(Load-Parts "it")
  "microbiology"       = @(Load-Parts "mb")
  "practical"          = @(Load-Json "data/practical.json")
}

$SUBJECTS_JSON = @'
[
  { "id": "medical-law", "name": "의료관계법규", "status": "ready", "description": "의료법·의료기사법·감염병예방법·지역보건법·혈액관리법" },
  { "id": "public-health", "name": "공중보건학개론", "status": "ready", "description": "역학·예방·환경·모자·보건행정" },
  { "id": "anatomy", "name": "해부생리학개론", "status": "ready", "description": "기초 해부·생리(임상생리 검사와 구분)" },
  { "id": "histopathology", "name": "조직병리학", "status": "ready", "description": "고정·처리·박절·염색·색소·인공산물·IHC" },
  { "id": "physiology", "name": "임상생리학", "status": "ready", "description": "심전도·폐기능·뇌파·근전도·초음파생리" },
  { "id": "clinical-chemistry", "name": "임상화학", "status": "ready", "description": "전해질·효소·대사·내분비·정도관리" },
  { "id": "hematology", "name": "혈액학", "status": "ready", "description": "혈구·응고·도말·혈액종양" },
  { "id": "immuno-transfusion", "name": "면역혈청학·수혈의학", "status": "ready", "description": "혈액형·항체·교차·수혈반응·혈청학" },
  { "id": "microbiology", "name": "임상미생물학", "status": "ready", "description": "염색·배양·동정·감수성·감염관리" },
  { "id": "practical", "name": "실기(사진·도표형)", "status": "ready", "description": "국시 3교시형 이미지·도표 MCQ" }
]
'@

$MIN_COUNTS = @{
  "medical-law" = 80; "public-health" = 50; "anatomy" = 50; "histopathology" = 100
  "physiology" = 100; "clinical-chemistry" = 100; "hematology" = 100
  "immuno-transfusion" = 100; "microbiology" = 100; "practical" = 80
}

# ---- validate ----
$errors = New-Object System.Collections.Generic.List[string]
foreach ($key in $QUESTIONS.Keys) {
  $arr = @($QUESTIONS[$key])
  $min = if ($MIN_COUNTS.ContainsKey($key)) { $MIN_COUNTS[$key] } else { 1 }
  if ($arr.Count -lt $min) { $errors.Add("$key length=$($arr.Count) (need >=$min)") }
  $ids = New-Object System.Collections.Generic.HashSet[string]
  foreach ($q in $arr) {
    if (-not $ids.Add([string]$q.id)) { $errors.Add("dup $($q.id)") }
    if (-not ($q.choices -is [array]) -or @($q.choices).Count -ne 5) { $errors.Add("$($q.id) choices") }
    if ($q.answerIndex -lt 0 -or $q.answerIndex -gt 4) { $errors.Add("$($q.id) answerIndex") }
    if (-not ($q.explainWrong -is [array]) -or @($q.explainWrong).Count -ne 5) { $errors.Add("$($q.id) ew") }
    elseif ($q.explainWrong[$q.answerIndex] -ne "") { $errors.Add("$($q.id) ew answer not empty") }
  }
}
if ($errors.Count) {
  $errors | ForEach-Object { Write-Error $_ -ErrorAction Continue }
  exit 1
}

# ---- emit ----
# JSON string escape that keeps Korean literal (unlike ConvertTo-Json's \uXXXX).
function Esc([string]$s) {
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.Append('"')
  foreach ($ch in $s.ToCharArray()) {
    switch ($ch) {
      '"'  { [void]$sb.Append('\"') }
      '\'  { [void]$sb.Append('\\') }
      "`n" { [void]$sb.Append('\n') }
      "`r" { [void]$sb.Append('\r') }
      "`t" { [void]$sb.Append('\t') }
      default {
        if ([int]$ch -lt 0x20) { [void]$sb.Append('\u{0:x4}' -f [int]$ch) }
        else { [void]$sb.Append($ch) }
      }
    }
  }
  [void]$sb.Append('"')
  $sb.ToString()
}

function EscArr($arr) {
  "[" + ((@($arr) | ForEach-Object { Esc ([string]$_) }) -join ",") + "]"
}

$out = New-Object System.Text.StringBuilder
[void]$out.Append("/**`n * 임상병리사 CBT — 문제 은행 (scripts/assemble-questions.ps1 생성)`n * SUBJECTS + QUESTIONS 전역 (classic script)`n * answerIndex: 0–4, explainWrong[answerIndex]는 `"`"`n */`n")
[void]$out.Append("var SUBJECTS = $($SUBJECTS_JSON.Trim());`n`n")
[void]$out.Append("var QUESTIONS = {`n")
$total = 0
foreach ($key in $QUESTIONS.Keys) {
  [void]$out.Append("  $(Esc $key): [`n")
  foreach ($q in @($QUESTIONS[$key])) {
    $total++
    [void]$out.Append("    {`n")
    [void]$out.Append("      id: $(Esc ([string]$q.id)),`n")
    [void]$out.Append("      stem: $(Esc ([string]$q.stem)),`n")
    if ($q.PSObject.Properties["image"] -and $q.image) { [void]$out.Append("      image: $(Esc ([string]$q.image)),`n") }
    if ($q.PSObject.Properties["major"] -and $q.major) { [void]$out.Append("      major: $(Esc ([string]$q.major)),`n") }
    [void]$out.Append("      choices: $(EscArr $q.choices),`n")
    [void]$out.Append("      answerIndex: $($q.answerIndex),`n")
    [void]$out.Append("      explainCorrect: $(Esc ([string]$q.explainCorrect)),`n")
    [void]$out.Append("      explainWrong: $(EscArr $q.explainWrong),`n")
    [void]$out.Append("    },`n")
  }
  [void]$out.Append("  ],`n")
}
[void]$out.Append("};`n")

[IO.File]::WriteAllText((Join-Path $root "questions.js"), $out.ToString(), (New-Object Text.UTF8Encoding($false)))
Write-Host "OK: wrote questions.js — $total items across $($QUESTIONS.Keys.Count) subjects"
foreach ($key in $QUESTIONS.Keys) { Write-Host "  $key $(@($QUESTIONS[$key]).Count)" }
