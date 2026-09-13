/**
 * 임상병리사 CBT — 조직병리학 문제 은행
 * answerIndex: 0–4, explainWrong[answerIndex]는 ""
 */
var SUBJECTS = [
  {
    id: "histopathology",
    name: "조직병리학",
    status: "ready",
    description: "고정·처리·박절·염색·색소·인공산물",
  },
  {
    id: "clinical-chemistry",
    name: "임상화학",
    status: "preparing",
    description: "준비중",
  },
  {
    id: "hematology",
    name: "혈액학",
    status: "preparing",
    description: "준비중",
  },
  {
    id: "microbiology",
    name: "임상미생물학",
    status: "preparing",
    description: "준비중",
  },
  {
    id: "immuno-transfusion",
    name: "면역혈청학·수혈의학",
    status: "preparing",
    description: "준비중",
  },
  {
    id: "physiology",
    name: "임상생리학",
    status: "preparing",
    description: "준비중",
  },
];

var QUESTIONS = {
  histopathology: [
    {
      id: "hp01",
      stem: "조직 고정의 주된 목적으로 가장 적절한 것은?",
      choices: [
        "세포 내 효소 활성을 최대화한다",
        "조직의 형태와 화학 조성을 가능한 한 생체와 유사하게 보존한다",
        "조직의 수분을 완전히 제거한다",
        "핵산을 선택적으로 분해한다",
        "염색성을 완전히 소실시킨다",
      ],
      answerIndex: 1,
      explainCorrect:
        "고정(fixation)은 자가분해·부패를 막고 조직·세포의 형태와 화학 성분을 생체에 가깝게 보존하는 것이 핵심 목적이다.",
      explainWrong: [
        "고정은 효소 활성을 억제하여 자가분해를 막는다. 활성을 최대화하지 않는다.",
        "",
        "수분 제거는 탈수(dehydration) 과정의 목적이다.",
        "고정은 핵산을 분해하기보다 보존·안정화하는 방향이다.",
        "고정은 이후 염색이 가능하도록 조직을 보존한다.",
      ],
    },
    {
      id: "hp02",
      stem: "10% 중성완충포르말린(NBF)의 실제 포름알데히드 농도에 가장 가까운 것은?",
      choices: ["1%", "4%", "10%", "37%", "50%"],
      answerIndex: 1,
      explainCorrect:
        "시판 포르말린은 약 37–40% 포름알데히드 수용액이며, 이를 1:9로 희석한 10% 포르말린은 약 3.7–4% 포름알데히드에 해당한다.",
      explainWrong: [
        "1%는 너무 낮다. 표준 10% 포르말린은 약 4%이다.",
        "",
        "10%는 희석비(부피비)를 가리키며, 실제 포름알데히드 중량/부피 농도는 약 4%이다.",
        "37%는 시판 원액(stock formalin) 농도이다.",
        "50%는 표준 고정액 농도가 아니다.",
      ],
    },
    {
      id: "hp03",
      stem: "중성완충포르말린을 사용하는 주된 이유로 옳은 것은?",
      choices: [
        "산성화로 인한 포르말린 색소 침착을 줄인다",
        "조직 경도를 극대화한다",
        "탈수를 동시에 수행한다",
        "지질을 선택적으로 용해한다",
        "핵산만 고정한다",
      ],
      answerIndex: 0,
      explainCorrect:
        "포르말린이 산성이 되면 포르말린 색소(acid formalin hematin)가 생기기 쉽다. 인산완충 등으로 pH를 중성 근처로 유지하면 이를 억제할 수 있다.",
      explainWrong: [
        "",
        "완충의 주목적은 경도 극대화가 아니다.",
        "탈수는 고정 이후 별도 과정이다.",
        "포르말린은 지질을 잘 보존하는 편이며, 선택적 지질 용해가 목적이 아니다.",
        "포르말린은 단백질 가교를 통한 전반적 고정이다.",
      ],
    },
    {
      id: "hp04",
      stem: "조직 처리(processing)에서 탈수 → 투명 → 침투의 순서로 진행할 때, 투명(clearing)에 흔히 쓰이는 시약은?",
      choices: ["에탄올", "자일렌(xylene)", "파라핀", "생리식염수", "수산화나트륨"],
      answerIndex: 1,
      explainCorrect:
        "투명제는 탈수제(알코올)와 포매제(파라핀) 모두와 혼화되어야 한다. 자일렌이 대표적이다.",
      explainWrong: [
        "에탄올은 탈수제이다.",
        "",
        "파라핀은 침투·포매제이다.",
        "생리식염수는 조직 처리 투명 단계에 쓰이지 않는다.",
        "NaOH는 조직 처리 표준 시약이 아니다.",
      ],
    },
    {
      id: "hp05",
      stem: "파라핀 포매 조직의 통상적인 박절(sectioning) 두께로 가장 적절한 것은?",
      choices: ["0.1–0.5 μm", "1–2 μm", "4–6 μm", "20–30 μm", "50–100 μm"],
      answerIndex: 2,
      explainCorrect:
        "일반 H&E용 파라핀 절편은 보통 4–6 μm(또는 약 3–5 μm)로 박절한다.",
      explainWrong: [
        "0.1–0.5 μm는 전자현미경 초박절편 범위에 가깝다.",
        "1–2 μm는 일부 특수 목적(예: 신장 생검 등)에서 쓰일 수 있으나 일반 H&E 표준은 아니다.",
        "",
        "20–30 μm는 동결절편·일부 특수 목적에 가깝고 일반 파라핀 H&E보다 두껍다.",
        "50–100 μm는 통상 현미경 관찰용 박절 두께가 아니다.",
      ],
    },
    {
      id: "hp06",
      stem: "H&E 염색에서 hematoxylin이 주로 염색하는 구조는?",
      choices: [
        "세포질 단백질",
        "핵(핵산)",
        "중성 점액",
        "지질 방울",
        "교원섬유만",
      ],
      answerIndex: 1,
      explainCorrect:
        "Hematoxylin(실제로는 hematein–금속 매염 복합체)은 염기성(양전하) 염료로 산성인 핵산(DNA/RNA)을 청색~자색으로 염색한다.",
      explainWrong: [
        "세포질은 주로 eosin 등 산성 염료에 염색된다.",
        "",
        "점액은 PAS 등 특수염색으로 관찰하는 경우가 많다.",
        "지질은 Oil Red O, Sudan 등으로 염색한다(동결절편).",
        "교원섬유는 Masson trichrome 등에서 강조된다.",
      ],
    },
    {
      id: "hp07",
      stem: "H&E 염색에서 eosin이 주로 염색하는 것은?",
      choices: [
        "핵 DNA",
        "산성 점액만",
        "세포질·세포외 기질 등 산성호성(호산성) 성분",
        "칼슘 침착만",
        "철 색소만",
      ],
      answerIndex: 2,
      explainCorrect:
        "Eosin은 산성 염료로, 양전하를 띠는 단백질성 구조(세포질, 근섬유, 교원 등)를 분홍~적색으로 염색한다.",
      explainWrong: [
        "핵은 주로 hematoxylin이 염색한다.",
        "산성 점액은 Alcian blue 등으로 선택적으로 염색한다.",
        "",
        "칼슘은 von Kossa 등으로 확인한다.",
        "철은 Prussian blue(Perls)로 확인한다.",
      ],
    },
    {
      id: "hp08",
      stem: "PAS(Periodic acid–Schiff) 염색이 양성으로 나타나는 물질로 가장 적절한 것은?",
      choices: [
        "중성 점액·글리코겐·기저막 등 다당류 성분",
        "중성지방만",
        "핵산만",
        "철만",
        "멜라닌만",
      ],
      answerIndex: 0,
      explainCorrect:
        "과요오드산이 당의 인접 디올을 알데히드로 산화하고, Schiff 시약이 반응하여 자홍색을 낸다. 글리코겐, 중성점액, 기저막 등이 양성이다.",
      explainWrong: [
        "",
        "중성지방은 Oil Red O/Sudan 계열이 적합하다.",
        "핵산은 Feulgen 등이 더 특이적이다.",
        "철은 Perls Prussian blue가 표준이다.",
        "멜라닌은 Fontana-Masson, bleaching 등으로 확인한다.",
      ],
    },
    {
      id: "hp09",
      stem: "글리코겐과 중성 점액을 PAS로 감별할 때 흔히 병행하는 처치는?",
      choices: [
        "디아스타제(아밀라아제) 소화 후 PAS",
        "자일렌 처리만",
        "산 가수분해만으로 충분",
        "은함침만",
        "형광항체법만",
      ],
      answerIndex: 0,
      explainCorrect:
        "디아스타제는 글리코겐을 분해하므로, 소화 후 PAS 음성이면 글리코겐, 잔존하면 점액 등 다른 PAS 양성 물질로 해석한다.",
      explainWrong: [
        "",
        "자일렌은 투명제이며 감별에 쓰이지 않는다.",
        "산 가수분해만으로 PAS 감별의 표준은 아니다.",
        "은함침은 세망섬유·진균 등에 쓰인다.",
        "형광항체법은 면역조직화학 영역이다.",
      ],
    },
    {
      id: "hp10",
      stem: "Masson trichrome 염색에서 교원섬유(collagen)가 전형적으로 나타나는 색은?",
      choices: ["청색 또는 녹색", "흑색", "황색만", "무색", "갈색만"],
      answerIndex: 0,
      explainCorrect:
        "Masson trichrome에서는 교원이 aniline blue 또는 light green에 의해 청록색으로, 근섬유·세포질은 적색으로 대비된다.",
      explainWrong: [
        "",
        "흑색은 은함침(세망) 등에서 더 흔하다.",
        "황색만으로 교원을 표시하지 않는다.",
        "교원은 분명한 색으로 대비된다.",
        "갈색은 hemosiderin·멜라닌 등 색소 관찰과 혼동하기 쉽다.",
      ],
    },
    {
      id: "hp11",
      stem: "세망섬유(reticular fiber)를 명확히 관찰하기 위해 흔히 사용하는 방법은?",
      choices: [
        "은함침법(예: Gomori, Gordon & Sweets)",
        "단순 H&E만",
        "Oil Red O",
        "Gram 염색",
        "Ziehl-Neelsen만",
      ],
      answerIndex: 0,
      explainCorrect:
        "세망섬유는 H&E에서 잘 안 보이며, 은함침으로 흑색의 미세 그물로 강조한다.",
      explainWrong: [
        "",
        "H&E만으로는 세망섬유 관찰이 어렵다.",
        "Oil Red O는 지질 염색이다.",
        "Gram은 세균 염색이다.",
        "ZN은 항산균 염색이다.",
      ],
    },
    {
      id: "hp12",
      stem: "조직 내 철(hemosiderin 등)을 증명하는 표준 특수염색은?",
      choices: [
        "Perls Prussian blue",
        "Fontana-Masson",
        "von Kossa",
        "Congo red",
        "Alcian blue",
      ],
      answerIndex: 0,
      explainCorrect:
        "Perls 반응은 ferric iron을 Prussian blue로 발색시켜 철을 청색으로 증명한다.",
      explainWrong: [
        "",
        "Fontana-Masson은 멜라닌·은친화성 물질에 쓰인다.",
        "von Kossa는 칼슘(인산칼슘 등) 증명에 쓰인다.",
        "Congo red는 아밀로이드이다.",
        "Alcian blue는 산성 점액이다.",
      ],
    },
    {
      id: "hp13",
      stem: "아밀로이드(amyloid) 염색에 가장 널리 쓰이는 것은?",
      choices: ["Congo red", "PAS만", "Hematoxylin만", "Sudan black만", "Toluidine blue만"],
      answerIndex: 0,
      explainCorrect:
        "Congo red 양성 후 편광현미경에서 apple-green birefringence가 아밀로이드의 고전적 소견이다.",
      explainWrong: [
        "",
        "PAS는 다당류에 양성이지만 아밀로이드 특이 염색이 아니다.",
        "Hematoxylin만으로 아밀로이드를 특이 동정하지 않는다.",
        "Sudan black은 지질·일부 색소에 관련된다.",
        "Toluidine blue는 비만세포 과립 등 metachromasia에 쓰인다.",
      ],
    },
    {
      id: "hp14",
      stem: "포르말린 색소(acid formalin hematin)의 특징으로 옳은 것은?",
      choices: [
        "산성 포르말린에서 생기기 쉽고, 어두운 갈흑색 결정성 색소로 관찰된다",
        "항상 PAS 양성이다",
        "오직 동결절편에서만 생긴다",
        "철염색에 반드시 양성이다",
        "자일렌에만 용해된다",
      ],
      answerIndex: 0,
      explainCorrect:
        "산성 포르말린과 혈액이 풍부한 조직에서 formalin pigment가 생기기 쉽다. 중성완충포르말린 사용·색소 제거 처치로 대응한다.",
      explainWrong: [
        "",
        "포르말린 색소는 PAS로 정의되지 않는다.",
        "파라핀 표본에서도 흔히 문제된다.",
        "포르말린 색소는 Perls에 음성인 경우가 많아 hemosiderin과 감별한다.",
        "제거에는 알코올성 피크르산·수산화암모늄 알코올 등이 쓰이며, '자일렌만'이 정답이 아니다.",
      ],
    },
    {
      id: "hp15",
      stem: "멜라닌과 hemosiderin을 감별할 때 도움이 되는 조합으로 가장 적절한 것은?",
      choices: [
        "멜라닌: Fontana-Masson(+), bleaching 가능 / 철: Perls(+)",
        "둘 다 Gram(+)",
        "둘 다 Oil Red O(+)",
        "둘 다 von Kossa(+)",
        "둘 다 Ziehl-Neelsen(+)",
      ],
      answerIndex: 0,
      explainCorrect:
        "멜라닌은 은친화(Fontana-Masson)와 표백(bleaching)으로, 철은 Perls로 감별하는 것이 표준적이다.",
      explainWrong: [
        "",
        "Gram은 세균 염색이다.",
        "Oil Red O는 지질이다.",
        "von Kossa는 칼슘이다.",
        "ZN은 항산균이다.",
      ],
    },
    {
      id: "hp16",
      stem: "동결절편(frozen section)의 장점으로 가장 적절한 것은?",
      choices: [
        "신속한 진단이 가능하고 지질·일부 효소 보존에 유리하다",
        "형태 보존이 파라핀보다 항상 우수하다",
        "영구보존에 가장 적합하다",
        "박절이 항상 더 얇고 균일하다",
        "특수염색이 일절 불필요하다",
      ],
      answerIndex: 0,
      explainCorrect:
        "동결절편은 수술 중 신속 진단에 쓰이며, 지질 염색·일부 면역/효소 검사에 유리하다. 다만 형태는 파라핀보다 떨어질 수 있다.",
      explainWrong: [
        "",
        "형태학적 세부는 대개 파라핀 절편이 우수하다.",
        "장기 보관·표준 영구표본은 파라핀이 일반적이다.",
        "동결절편은 빙결 인공산물 등으로 두께·형태가 불리할 수 있다.",
        "필요에 따라 특수염색·면역염색을 시행한다.",
      ],
    },
    {
      id: "hp17",
      stem: "조직 처리 중 과도한 탈수 또는 부적절한 투명으로 흔히 발생하는 문제는?",
      choices: [
        "조직의 과도한 경화·취약화 및 박절 곤란",
        "핵만 선택적으로 소실",
        "항상 포르말린 색소만 증가",
        "파라핀 침투가 자동으로 개선",
        "염색성이 반드시 향상",
      ],
      answerIndex: 0,
      explainCorrect:
        "과도한 탈수·장시간 자일렌 등은 조직을 딱딱하고 부스러지게 만들어 박절·리본 형성을 어렵게 한다.",
      explainWrong: [
        "",
        "핵만 선택 소실되는 것은 전형적 설명이 아니다.",
        "포르말린 색소는 주로 산성 고정과 관련된다.",
        "과도한 탈수/투명은 침투를 돕기보다 조직을 손상시킬 수 있다.",
        "과도 처리는 염색성을 해칠 수 있다.",
      ],
    },
    {
      id: "hp18",
      stem: "박절 시 knife mark(칼자국) 인공산물의 흔한 원인으로 적절한 것은?",
      choices: [
        "칼날의 결함·이물질 또는 부적절한 칼 각도",
        "hematoxylin 농도가 낮음",
        "커버글라스만의 문제",
        "현미경 광원 불량만",
        "염색 시간 단축만",
      ],
      answerIndex: 0,
      explainCorrect:
        "칼날 nick, 오염, 부적절한 clearance angle 등은 절편에 직선상 흠집(knife lines)을 남긴다.",
      explainWrong: [
        "",
        "hematoxylin 농도는 염색 강도 문제이다.",
        "커버글라스는 봉입 단계 문제이다.",
        "광원은 관찰 조건이다.",
        "염색 시간은 염색 결과에 영향을 주지만 knife mark의 원인이 아니다.",
      ],
    },
    {
      id: "hp19",
      stem: "절편에서 chatter(진동 무늬, washboard)가 나타날 때 점검할 사항으로 옳은 것은?",
      choices: [
        "블록·칼의 고정 상태, 칼 각도, 절삭 속도, 조직 경도",
        "오직 eosin 농도만",
        "커버슬립 두께만",
        "현미경 대물렌즈만",
        "환자 연령만",
      ],
      answerIndex: 0,
      explainCorrect:
        "Chatter는 진동에 의한 규칙적 두께 변화로, 칼·블록 고정 불량, 잘못된 각도, 빠른 절삭, 과도히 단단한 조직 등이 원인이다.",
      explainWrong: [
        "",
        "eosin은 염색 관련이다.",
        "커버슬립은 봉입 관련이다.",
        "대물렌즈는 관찰 광학이다.",
        "환자 연령은 직접 원인이 아니다.",
      ],
    },
    {
      id: "hp20",
      stem: "조직 내 칼슘 침착을 증명하는 데 흔히 쓰이는 염색법은?",
      choices: ["von Kossa", "Perls", "Congo red", "Gram", "PAS-diastase만"],
      answerIndex: 0,
      explainCorrect:
        "von Kossa는 은치환 반응으로 인산칼슘 등 칼슘염을 흑갈색~흑색으로 나타낸다(실제로는 음이온 쪽 반응으로 이해).",
      explainWrong: [
        "",
        "Perls는 철이다.",
        "Congo red는 아밀로이드이다.",
        "Gram은 세균이다.",
        "PAS-D는 글리코겐 감별이다.",
      ],
    },
    {
      id: "hp21",
      stem: "산성 점액(acid mucin)을 선택적으로 염색하는 데 적합한 것은?",
      choices: ["Alcian blue (pH 2.5 등)", "Oil Red O", "Perls", "Fontana-Masson", "Ziehl-Neelsen"],
      answerIndex: 0,
      explainCorrect:
        "Alcian blue는 산성 점액다당류를 청색으로 염색한다. pH에 따라 설포화/카복실 점액 감별에 활용한다.",
      explainWrong: [
        "",
        "Oil Red O는 중성지방이다.",
        "Perls는 철이다.",
        "Fontana-Masson은 멜라닌 등이다.",
        "ZN은 항산균이다.",
      ],
    },
    {
      id: "hp22",
      stem: "고정액으로 쓰이는 Bouin 액의 특징으로 옳은 것은?",
      choices: [
        "피크르산·포르말린·초산을 포함하며 핵 염색성과 결합조직 관찰에 유리한 경우가 많다",
        "지질 보존에 가장 우수하여 Oil Red O의 표준이다",
        "전자현미경 초미세구조 고정의 1차 표준이다",
        "탈수·투명·침투를 한 용액으로 대체한다",
        "철 색소만 선택 고정한다",
      ],
      answerIndex: 0,
      explainCorrect:
        "Bouin은 picric acid, formalin, acetic acid 조성으로, 위장관·핵 상세·일부 trichrome에 선호된다. 다만 피크르산 잔류 관리가 필요하다.",
      explainWrong: [
        "",
        "지질은 동결·특수 고정/염색이 더 적합하다.",
        "EM은 글루타르알데히드 등이 표준이다.",
        "조직 처리는 별도 단계가 필요하다.",
        "철만 선택 고정하지 않는다.",
      ],
    },
    {
      id: "hp23",
      stem: "탈칼슘(decalcification)이 필요한 검체로 가장 적절한 것은?",
      choices: [
        "골조직·치아 등 단단한 무기질화 조직",
        "지방조직만",
        "혈액 도말만",
        "소변 침사만",
        "혈청만",
      ],
      answerIndex: 0,
      explainCorrect:
        "골·치아 등은 산 또는 킬레이트제로 탈칼슘 후 파라핀 박절이 가능하다. 과도한 탈칼슘은 핵 염색성을 해칠 수 있다.",
      explainWrong: [
        "",
        "지방은 동결절편·지질염색이 이슈이다.",
        "혈액 도말은 세포형태학 영역이다.",
        "소변 침사는 요검사이다.",
        "혈청은 임상화학이다.",
      ],
    },
    {
      id: "hp24",
      stem: "H&E에서 핵이 과도하게 옅게 염색될 때 점검할 사항으로 적절한 것은?",
      choices: [
        "hematoxylin 활성·염색 시간, 분화(differentiation), 탈칼슘 과다, 고정 상태",
        "오직 자일렌 브랜드만",
        "커버글라스 굴절률만",
        "환자 성별만",
        "현미경 전원 주파수만",
      ],
      answerIndex: 0,
      explainCorrect:
        "핵 염색 부실은 헤마톡실린 효력 저하, 과다 분화, 과다 탈칼슘, 불량 고정 등과 관련된다.",
      explainWrong: [
        "",
        "자일렌은 주로 투명/탈파라핀에 관여한다.",
        "커버글라스는 광학적 관찰에 영향이 있을 수 있으나 핵 염색 부실의 1차 원인이 아니다.",
        "성별은 직접 원인이 아니다.",
        "전원 주파수는 핵 염색과 무관하다.",
      ],
    },
  ],
};
