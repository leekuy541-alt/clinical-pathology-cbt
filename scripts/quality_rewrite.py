# -*- coding: utf-8 -*-
"""
Quality rewrite for CBT banks:
- same-category distractors (kill cross-contaminated / nonsense wrongs)
- natural Korean explanations (kill template particles / boilerplate)
- meta-hint balance (만-suffix, length, absolute words)
Preserves id and answerIndex. Does not paste 국시원 verbatim text.
"""
from __future__ import annotations
import json, re, hashlib
from pathlib import Path
from copy import deepcopy

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

ABS_RE = re.compile(r"항상|절대|모든|반드시|결코|전부|무조건|오직|전혀")
TEMPLATE_EC = re.compile(
    r"이 개념을 선택지에 옮기면|따라서 정답은 「|이웃 선택지와 정의·적용 범위|"
    r"이\(가\) 정답이다|은\(는\)|과\(와\)"
)
TEMPLATE_EW = re.compile(
    r"인접해 보이지만 이 문항의 정의·상황에 맞지 않으므로 배제|"
    r"같은 분류의와 인접한 다른 개념|인접한 다른 개념|"
    r"은\(는\)|과\(와\)|이\(가\)"
)
JUNK_CHOICE = re.compile(
    r"^(가스여서|금속이어서|지방만 녹여서|물에 잘 녹아서|무관해서|색만 보려고|"
    r"향만 보려고|가격만 보려고|점심을 비교한다|벽색만 맞춘다|이름만 맞춘다|"
    r"미관만|습관만으로|가열한다|끓인다|빛에 장시간 둔다|안 섞는다|"
    r"세균만 보인다|바이러스만 보인다|혈액형을 보려고|조명을 보려고|"
    r"추측 관련 항목|삭제 관련 항목|식별 생략 관련 항목|보호구 금지 관련 항목|"
    r"관련 항목$|우선 본다$|충분하다$|버린다$|맛$|향만$|무게만$|"
    r"게임 관련 항목|광고 관련 항목|강제한다고 우선 본다|"
    r"무시한다고 우선 본다|임의로 쓴다고 본다|삭제한다고 우선 본다|"
    r"라벨을 제거한다고 본다|반만 해동한다|장시간 실온 방치한다|"
    r"빛에 방치한다|내일 보고한다|사회관계망에 공개한다|"
    r"안경 착용 관련 항목|왼손잡이 관련 항목|키 170 cm 관련 항목|"
    r"가벼운 대화 관련 항목|미관만으로 충분하다|비용만으로 충분하다|"
    r"습관만으로 충분하다|무관해서라고 본다|미관 때문에 관련 항목|"
    r"향기 때문에 관련 항목|무게 때문에 관련 항목|"
    r"약하게만 불어도 되어서|자세가 무관해서|코집게가 금지여서|"
    r"설명이 불필요해서|한 번만 하면 되어서|색만 봐서|향만 봐서|"
    r"키만으로 충분하다|시력만으로 충분하다|청력만으로 충분하다|"
    r"옷색만으로 충분하다|무관해서|색만 봐서|향만 봐서|가격만 봐서|"
    r"A형 관련 항목|B형 관련 항목|O형 관련 항목|AB형 관련 항목|"
    r"2년 관련 항목|혈당을 올려서 관련 항목|칼륨을 올려서 관련 항목|"
    r"빌리루빈을 올려서 관련 항목|철만|엽산만|비타민 C만|멜라닌만|"
    r"혈액형 때문에 관련 항목|심전도 때문에 관련 항목|"
    r"폐기능 때문에 관련 항목|뇌파 때문에 관련 항목|"
    r"외막만 있어서 관련 항목|지질다당만 있어서 관련 항목|"
    r"핵만 있어서 관련 항목|편모만 있어서 관련 항목|"
    r"머리카락|손톱|고막|각막|증발만|인슐린 잔류만|"
    r"분석기 보정 오류만|세균 오염만)$"
    r"|점심을 비교|벽색만|이름만 맞춘다|조명을 보려고|"
    r"혈액형을 보려고|미관만|가격만|향기만|무게만|"
    r"추측 관련|삭제 관련|식별 생략|보호구 금지|"
    r"관련 항목|우선 본다|라고 본다|만으로 충분|"
    r"색만 |향만 |가격만 |무관해서"
)

MAN_ONLY = re.compile(r"만$|만 |만\.|만,")

def ulen(s: str) -> int:
    return len(list(s or ""))

def strip_ec_core(s: str) -> str:
    s = s or ""
    s = re.sub(r"\s*이 개념을 선택지에 옮기면 「.*?」이\(가\) 정답이다\.?", "", s)
    s = re.sub(r"\s*따라서 정답은 「.*?」이다\.?", "", s)
    s = re.sub(r"\s*이웃 선택지와 정의·적용 범위를 가르면 「.*?」만 남는다\.?", "", s)
    s = re.sub(r"[^.]*은\(는\) 같은 분류의와 인접한 다른 개념이다\.?\s*", "", s)
    s = re.sub(r"은\(는\)", "은", s)
    s = re.sub(r"이\(가\)", "이", s)
    s = re.sub(r"과\(와\)", "과", s)
    parts = re.split(r"(?<=다\.)\s+", s.strip())
    keep = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        if any(x in p for x in ("인접", "배제", "이웃 선택지", "정답은")):
            continue
        keep.append(p)
        if len(keep) >= 3:
            break
    return " ".join(keep).strip()

def strip_ew_tip(s: str) -> str:
    s = s or ""
    s = re.sub(
        r"\s*정답 「.*?」과\(와\) 인접해 보이지만 이 문항의 정의·상황에 맞지 않으므로 배제한다\.?",
        "",
        s,
    )
    s = re.sub(r"은\(는\) 같은 분류의와 인접한 다른 개념이다\.?", "", s)
    s = re.sub(r"은\(는\)", "은", s)
    s = re.sub(r"이\(가\)", "이", s)
    s = re.sub(r"과\(와\)", "과", s)
    s = re.sub(r"\s*은 정답이 아니다\.?", "", s)
    return s.strip().rstrip(".")

# ---------------------------------------------------------------------------
# Curated full choice sets for worst CC items (answer stays at answerIndex)
# Format: id -> (choices[5], ec, ew[5] with '' at ai)
# We rebuild by placing correct at existing answerIndex.
# ---------------------------------------------------------------------------

# For each id: correct, wrongs[4], ec, ew_for_wrongs[4]
CC_CURATED = {
    "cc02": (
        "혈구의 해당작용",
        ["증발에 의한 농축", "세균 증식에 의한 당 소모", "인슐린 잔류에 의한 당 이용", "분석기 보정  Drift"],
        "분리 전 실온 방치 시 혈구가 포도당을 해당작용으로 소모하여 혈당이 낮아진다. 채혈 후 신속 분리하거나 해당억제 첨가관을 쓰는 이유가 여기에 있다.",
        [
            "증발이 주된 혈당 감소 기전은 아니며, 오히려 일부 성분은 농축될 수 있다.",
            "세균 오염으로 당이 줄 수는 있으나 일상적인 실온 단시간 방치의 주된 설명은 아니다.",
            "채혈관 안에 치료용 인슐린이 남아 혈당을 낮춘다는 기전은 성립하지 않는다.",
            "분석기 보정 이상은 분석 단계 오류이며, 실온 방치에 따른 감소의 원인이 아니다.",
        ],
    ),
    "cc05": (
        "8–12시간",
        ["1시간", "2시간", "4시간", "24시간"],
        "공복 혈당·중성지방 등은 통상 8–12시간(하룻밤) 금식 후 채혈한다. 너무 짧으면 식사 영향이 남고, 과도하게 길면 불필요하게 불편하다.",
        [
            "1시간은 식후 영향이 크게 남아 공복 기준으로 부족하다.",
            "2시간도 일반적인 공복 혈당 금식 시간으로 쓰이지 않는다.",
            "4시간은 일부 검사의 최소 간격에 가깝고 표준 공복 혈당 기준은 아니다.",
            "24시간 금식은 과도하며 일상 공복 혈당 지침이 아니다.",
        ],
    ),
    "cc08": (
        "간·뼈",
        ["심장·골격근", "췌장·침샘", "갑상선·부신", "신장·방광"],
        "ALP는 간(담도)과 뼈 동종효소가 임상에서 흔히 감별된다. 상승 시 GGT·병력·연령 등으로 기원을 나눈다.",
        [
            "심장·골격근 손상은 CK·트로포닌 등에서 주로 평가한다.",
            "췌장·침샘은 아밀라제·리파제 축의 감별 대상이다.",
            "갑상선·부신은 호르몬 검사로 평가하며 ALP 주 기원이 아니다.",
            "신장·방광은 신기능·요검사 축이며 ALP의 대표 기원 쌍이 아니다.",
        ],
    ),
    "cc10": (
        "담도 폐쇄·간세포성 황달",
        ["혈관 내 용혈", "길버트증후군", "신생아 생리적 황달", "크레아틴키나아제 상승"],
        "직접(포합) 빌리루빈이 우세하면 담도 폐쇄나 간세포 손상에서 포합형이 혈액으로 역류한 양상에 가깝다.",
        [
            "혈관 내 용혈은 주로 간접(비포합) 빌리루빈 우세로 나타난다.",
            "길버트증후군은 비포합형 빌리루빈 상승이 특징이다.",
            "신생아 생리적 황달도 비포합형 증가 패턴에 가깝다.",
            "CK 상승은 근육 손상 지표로 빌리루빈 분획 해석과 직접 대응하지 않는다.",
        ],
    ),
    "cc11": (
        "용혈 또는 포합 장애",
        ["총수담관 결석", "급성 담관염", "원발성 담즙성 담관염", "간외 담도 폐쇄"],
        "간접(비포합) 빌리루빈이 우세하면 용혈이나 간 내 포합 장애를 우선 생각한다.",
        [
            "총수담관 결석은 직접형 우세·담도 효소 상승과 더 잘 맞는다.",
            "급성 담관염도 담도계 폐쇄·감염으로 직접형 황달에 가깝다.",
            "원발성 담즙성 담관염은 만성 담도 손상으로 직접형 패턴이 흔하다.",
            "간외 담도 폐쇄는 포합형 빌리루빈 역류가 전형적이다.",
        ],
    ),
    "cc14": (
        "죽상동맥경화",
        ["급성 용혈", "급성췌장염", "갑상선기능항진", "철결핍빈혈"],
        "LDL 콜레스테롤 증가는 죽상동맥경화 위험과 가장 직접적으로 연결해 배운다.",
        [
            "급성 용혈은 빌리루빈·LD·합토글로빈 등으로 본다.",
            "급성췌장염은 아밀라제·리파제로 평가한다.",
            "갑상선기능항진은 TSH·유리 T4 축으로 본다.",
            "철결핍은 철·TIBC·페리틴 패턴으로 평가한다.",
        ],
    ),
    "cc15": (
        "충분한 공복",
        ["혈액형 확인", "신장 길이 측정", "시력 검사", "청력 검사"],
        "중성지방은 식사 후 크게 오르므로 검사 전 충분한 공복이 필요하다.",
        [
            "혈액형은 수혈 검사이며 중성지방 채혈 전 조건이 아니다.",
            "신장 영상 측정은 지질 검사 전처치와 무관하다.",
            "시력 검사는 안과 평가이며 공복 지질과 무관하다.",
            "청력 검사는 이비인후 평가이며 공복 지질과 무관하다.",
        ],
    ),
    "cc18": (
        "철 감소, TIBC 증가",
        ["철 증가, TIBC 감소", "철 감소, TIBC 감소", "철 정상, 페리틴 증가", "철 증가, 페리틴 감소"],
        "철결핍에서는 혈청철이 줄고 총철결합능(TIBC)이 보상적으로 증가하는 전형 패턴을 배운다.",
        [
            "철 증가·TIBC 감소는 혈색소증 등 철과잉 쪽에 가깝다.",
            "철·TIBC가 함께 감소하면 만성질환빈혈 패턴에 가깝다.",
            "페리틴 증가는 철결핍보다 염증·철과잉을 시사한다.",
            "철이 늘고 페리틴이 줄어드는 조합은 전형적인 철결핍이 아니다.",
        ],
    ),
    "cc19": (
        "철결핍",
        ["혈색소증", "만성염증", "급성감염", "원발성 갑상선기능저하"],
        "페리틴은 저장철을 반영하므로 낮으면 철결핍을 우선 시사한다. 다만 염증 시에는 위증가할 수 있어 해석에 주의한다.",
        [
            "혈색소증에서는 페리틴이 보통 상승한다.",
            "만성염증에서는 페리틴이 급성기반응으로 오를 수 있다.",
            "급성감염에서도 페리틴이 상승하는 경우가 많다.",
            "원발성 갑상선기능저하는 TSH·FT4로 진단하며 페리틴 저하의 직접 원인이 아니다.",
        ],
    ),
    "cc20": (
        "원발성 갑상선기능저하",
        ["원발성 갑상선기능항진", "이차성 갑상선기능저하", "정상 갑상선 기능", "부갑상선기능항진"],
        "TSH 상승과 FT4 저하 조합은 갑상선 자체의 기능저하(원발성)에 가장 가깝다.",
        [
            "원발성 항진은 보통 TSH 저하·FT4 상승이다.",
            "이차성 저하(뇌하수체)는 TSH가 낮거나 부적절하게 정상인 경우가 많다.",
            "정상 기능에서는 TSH·FT4가 참고범위에 있다.",
            "부갑상선기능항진은 칼슘·PTH 축이며 갑상선자극호르몬 패턴과 다르다.",
        ],
    ),
    "cc21": (
        "감소한다",
        ["증가한다", "변하지 않는다", "측정 불가가 된다", "음수가 된다"],
        "대사성 산증의 일차 변화는 중탄산(HCO3−) 감소이다. 호흡으로 PaCO2를 낮춰 보상하는 패턴을 함께 배운다.",
        [
            "HCO3− 증가는 대사성 알칼리증의 일차 변화에 가깝다.",
            "산염기 장애에서 일차 HCO3−가 그대로인 경우는 전형이 아니다.",
            "중탄산은 혈액가스·전해질로 측정 가능하며 ‘측정 불가’가 정의가 아니다.",
            "농도가 음수가 되는 것은 생리적으로 성립하지 않는다.",
        ],
    ),
    "cc22": (
        "증가한다",
        ["감소한다", "변하지 않는다", "음수가 된다", "항상 0이 된다"],
        "호흡성 산증의 일차 변화는 PaCO2 증가(환기 저하)이다. 신장이 HCO3−를 올려 보상한다.",
        [
            "PaCO2 감소는 호흡성 알칼리증의 일차 변화이다.",
            "원발 호흡성 산증에서 PaCO2가 그대로인 경우는 전형이 아니다.",
            "분압이 음수가 될 수는 없다.",
            "PaCO2가 0이 되는 것은 생존 가능한 상태가 아니다.",
        ],
    ),
    "cc31": (
        "삼투압 갭 증가",
        ["음이온 갭 감소", "델타 체크 위반", "참고범위 재설정", "보정곡선 재작성"],
        "측정 삼투압이 계산 삼투압보다 크게 벌어지면 삼투압 갭 증가로 부르며, 알코올·독성 삼투 활성 물질 등을 의심한다.",
        [
            "음이온 갭은 Na−(Cl+HCO3)로 산염기 해석에 쓰이며 삼투압 갭과 다르다.",
            "델타 체크는 동일 환자 연속 결과의 급변 점검이다.",
            "참고범위 재설정은 집단 분포 문제이지 개별 삼투압 갭의 이름이 아니다.",
            "보정곡선 재작성은 분석기 교정 절차이다.",
        ],
    ),
    "cc38": (
        "검사실 간 결과를 비교한다",
        ["매일 내부 QC만 반복한다", "라벨 색을 통일한다", "시약 냉장고 조명을 맞춘다", "점심시간을 통일한다"],
        "외부정도관리(신빙도조사)는 동일·유사 물질로 검사실 간 결과를 비교해 정확도·계통오차를 점검한다.",
        [
            "매일 내부 QC는 내부정도관리의 목적에 가깝다.",
            "라벨 색 통일은 식별·안전 이슈이지 외부정도관리의 목적이 아니다.",
            "냉장고 조명은 외부정도관리와 무관하다.",
            "근무 일정 통일은 정도관리 목적이 아니다.",
        ],
    ),
    "cc39": (
        "농도와 신호를 맞춘다",
        ["검체 바코드만 맞춘다", "실내 온도만 맞춘다", "LJ 추세만 맞춘다", "벽면 색만 맞춘다"],
        "보정(calibration)은 已知 농도의 표준으로 기기 신호와 농도의 관계를 맞추는 과정이다.",
        [
            "바코드는 검체 식별이며 농도-신호 교정과 다르다.",
            "실온 유지는 환경 관리이지 보정 자체의 정의가 아니다.",
            "추세(trend)는 QC 차트 해석 용어이다.",
            "시설 미관은 분석 보정과 무관하다.",
        ],
    ),
    "cc40": (
        "일부 항목이 농축·오차 난다",
        ["혈당이 0이 된다", "혈액형이 바뀐다", "모든 결과가 정확해진다", "용혈이 반드시 없어진다"],
        "지혈대를 과도히 오래 유지하면 정맥 울혈로 일부 단백·효소·칼륨 등이 농축되거나 오차가 날 수 있다.",
        [
            "혈당이 0이 되지는 않는다.",
            "혈액형은 지혈대 시간과 무관하다.",
            "울혈은 정확도를 높이지 않는다.",
            "오히려 용혈·농축 위험이 커질 수 있다.",
        ],
    ),
    "cc43": (
        "일부 비색을 방해한다",
        ["전해질이 모두 정상화된다", "항응고가 필요 없어진다", "차광이 불필요해진다", "삼투압 갭이 사라진다"],
        "유미(지질 혼탁) 혈청은 비색·비탁 측정에서 흡광·산란을 방해해 일부 항목에 간섭을 준다.",
        [
            "유미가 전해질을 정상으로 만들지는 않는다.",
            "항응고 필요 여부와 유미는 별개이다.",
            "빌리루빈 등 차광 항목의 요구가 없어지지 않는다.",
            "삼투압 갭 해석과는 직접 등가가 아니다.",
        ],
    ),
    "cc44": (
        "비색 간섭이 가능하다",
        ["응고가 촉진된다", "혈당만 정확히 된다", "차광이 금지된다", "반드시 희석이 불필요하다"],
        "황달(고빌리루빈) 혈청은 노란 색소가 비색 파장에 간섭할 수 있어 방법·시약에 따라 주의한다.",
        [
            "황달 자체가 응고를 촉진하는 것은 아니다.",
            "혈당만 정확해진다는 일반화는 틀리다.",
            "빌리루빈 측정은 오히려 차광이 중요하다.",
            "간섭 시 희석·재검 등 추가 조치가 필요할 수 있다.",
        ],
    ),
    "cc50": (
        "농축(일부 성분 상승)",
        ["희석(모든 성분 저하)", "태반 ALP 동종효소 출현", "직접빌리루빈만 선택 상승", "시약 로트 변경과 동일"],
        "탈수에서는 혈장량 감소로 일부 단백·혈구·요소 등이 상대적으로 농축되어 오를 수 있다.",
        [
            "탈수의 전형은 희석이 아니라 농축 쪽이다.",
            "태반 ALP는 임신 생리와 관련한다.",
            "탈수가 직접빌리루빈만 선택적으로 올리지는 않는다.",
            "시약 로트 변경은 분석·QC 이슈로 탈수와 다르다.",
        ],
    ),
    "cc51": (
        "태반 동종효소",
        ["골 동종효소만의 선택 상승", "장 동종효소만의 선택 상승", "신장 동종효소만의 선택 상승", "백혈구 동종효소만의 선택 상승"],
        "임신 중 ALP 상승은 태반 동종효소 기여로 설명하는 경우가 많다. 병적 담도·골 질환과 구분하려면 동종효소·임상 경과를 본다.",
        [
            "골 동종효소는 성장기·골질환에서 중요하나 임신 ALP의 대표 설명이 아니다.",
            "장 동종효소는 혈형·식사 등과 관련해 배우며 임신의 주된 설명이 아니다.",
            "신장 동종효소는 일반 임신 ALP 상승의 표준 설명이 아니다.",
            "백혈구 ALP는 별개 검사 개념으로 임신 혈청 ALP와 동일시하지 않는다.",
        ],
    ),
    "cc52": (
        "수용성(물에 잘 녹음)이어서",
        ["지용성이어서 사구체에서 통과", "기체 상태로 폐에서 배설", "금속이온에 결합해 여과", "단백결합이 없어 담즙으로만 배설"],
        "포합(직접) 빌리루빈은 수용성이라 신장에서 여과되어 소변에 나타날 수 있다. 비포합형은 알부민 결합·지용성으로 요중 배설이 어렵다.",
        [
            "비포합형이 더 지용성·알부민 결합성이며, 포합형이 소변으로 나오는 이유가 아니다.",
            "빌리루빈은 가스가 아니며 호흡으로 배설되지 않는다.",
            "금속 결합이 요중 빌리루빈의 기본 설명이 아니다.",
            "포합형은 담즙 배설이 주경로이지만, 혈중 증가 시 요중 배설도 가능하다.",
        ],
    ),
    "cc53": (
        "농축 또는 당·단백 부하",
        ["단순 희석뇨", "태반 ALP 상승", "직접빌리루빈 요배설", "심근표지 시간창"],
        "요비중 상승은 요 농축뿐 아니라 포도당·단백 등 용해 물질 부하로도 나타날 수 있다.",
        [
            "희석뇨는 요비중 저하 쪽으로 해석한다.",
            "태반 ALP는 혈청 효소 이슈이다.",
            "요중 빌리루빈은 시험지·화학 반응으로 보며 비중 상승의 일반 설명이 아니다.",
            "심근표지 시간창은 채혈 시점 해석이지 요비중 원인이 아니다.",
        ],
    ),
    "cc54": (
        "채혈 시점을 해석하려고",
        ["시약 색만 확인하려고", "검체 향만 확인하려고", "검사 수가만 비교하려고", "혈액형만 확인하려고"],
        "미오글로빈·CK-MB·트로포닌 등은 상승·정점·지속 시간이 달라, 심근표지 시간창을 알아야 채혈 시점과 결과를 해석할 수 있다.",
        [
            "시약 색 확인은 표지 시간창의 목적이 아니다.",
            "검체 냄새로 심근표지를 해석하지 않는다.",
            "수가 비교는 행정 이슈이다.",
            "혈액형은 수혈 검사이며 심근표지 시간창과 무관하다.",
        ],
    ),
    "cc55": (
        "참고치·임상·추이",
        ["숫자만으로 판정", "결과를 무시", "임의로 수치 수정", "타 부서 비난"],
        "임상화학 결과는 참고치와 임상 소견, 이전 추이를 함께 보는 것이 기본이다.",
        [
            "숫자만으로 임상 전체를 단정하기 어렵다.",
            "이상 결과를 무시하면 안 된다.",
            "수치를 임의 수정하는 것은 부정행위이다.",
            "해석 책임은 비난이 아니라 검증·소통이다.",
        ],
    ),
}

# Fix the one with typo Drift
CC_CURATED["cc02"] = (
    "혈구의 해당작용",
    ["증발에 의한 농축", "세균 증식에 의한 당 소모", "인슐린 잔류에 의한 당 이용", "분석기 보정 이상"],
    CC_CURATED["cc02"][2],
    CC_CURATED["cc02"][3],
)


# Additional CC curated (remaining severe)
CC_CURATED.update({
    "cc01": (
        "칼륨(K+)",
        ["나트륨(Na+)", "염소(Cl−)", "중탄산(HCO3−)", "요소질소(BUN)"],
        "적혈구 내부 칼륨 농도가 높아 용혈 시 혈청 칼륨이 위증가하기 쉽다. 용혈 검체에서는 칼륨 결과를 특히 경계한다.",
        [
            "나트륨은 용혈의 영향이 칼륨보다 상대적으로 작다.",
            "염소는 용혈의 대표 위증가 항목으로 쓰지 않는다.",
            "중탄산은 산염기·가스 분석 축에서 다루며 용혈 위증가의 전형이 아니다.",
            "BUN은 신기능 지표로 용혈 위증가의 대표 항목이 아니다.",
        ],
    ),
    "cc03": (
        "플루오르화나트륨이 해당 효소를 억제한다",
        ["EDTA가 칼슘을 공급한다", "헤파린이 해당을 촉진한다", "구연산염이 인슐린을 중화한다", "응고촉진제가 당을 합성한다"],
        "회색마개(혈당)관에는 해당억제제로 플루오르화나트륨이 들어 해당 효소를 억제해 채혈 후 혈당 감소를 줄인다.",
        [
            "EDTA는 칼슘을 제거하는 항응고제이며 칼슘을 공급하지 않는다.",
            "헤파린은 항응고 작용이지 해당을 촉진하지 않는다.",
            "구연산염은 응고검사용 항응고제이며 인슐린 중화가 목적이 아니다.",
            "응고촉진제는 혈청관에 쓰이며 포도당을 합성하지 않는다.",
        ],
    ),
    "cc04": (
        "혈청은 응고 후 섬유소원이 소모된다",
        ["혈장과 조성이 항상 같다", "혈장만 단백질이 없다", "혈청만 전해질이 없다", "혈장은 적혈구를 포함한다"],
        "혈청은 혈액을 응고시킨 뒤 얻는 액체로 섬유소원이 응고 과정에서 소모된다. 혈장은 항응고 전혈을 원심한 상층으로 섬유소원이 남는다.",
        [
            "혈청과 혈장은 섬유소원 유무 등에서 조성이 완전히 같지 않다.",
            "혈장에도 단백질이 있다.",
            "혈청에도 전해질이 있다.",
            "혈장은 무세포 상층이며 적혈구를 포함하지 않는다.",
        ],
    ),
    "cc06": (
        "약 2–3개월",
        ["2–3분", "2–3일", "2–3년", "적혈구 수명 10년"],
        "HbA1c는 적혈구 수명과 관련해 대략 지난 2–3개월의 평균 혈당을 반영한다.",
        [
            "분은 순간 혈당 시간 척도이다.",
            "수일은 단기 변동에 가깝고 HbA1c 반영 기간이 아니다.",
            "수년은 과도하게 길다.",
            "정상 적혈구 수명은 약 120일 전후이며 10년이 아니다.",
        ],
    ),
    "cc07": (
        "ALT",
        ["AST", "ALP", "CK", "LD"],
        "ALT는 간에 상대적으로 더 특이적인 아미노전이효소로 배운다. AST는 심근·골격근 등에도 많다.",
        [
            "AST는 간 외 조직에도 풍부해 특이도가 ALT보다 낮다.",
            "ALP는 담도·뼈 기원 감별에 쓴다.",
            "CK는 근육·심근 손상 지표이다.",
            "LD는 분포가 넓어 비특이적이다.",
        ],
    ),
    "cc09": (
        "GGT",
        ["CK", "아밀라제", "리파제", "트로포닌"],
        "GGT는 알코올·담도 질환에서 함께 오르기 쉬운 간담도 효소로 흔히 출제된다.",
        [
            "CK는 근육 손상 지표이다.",
            "아밀라제는 췌장·침샘 축이다.",
            "리파제는 췌장 손상에 상대적으로 특이적이다.",
            "트로포닌은 심근 손상 표지이다.",
        ],
    ),
    "cc12": (
        "아밀라제와 리파제",
        ["CK와 트로포닌", "ALT와 GGT", "TSH와 FT4", "BUN과 크레아티닌"],
        "급성췌장염 평가에서는 아밀라제와 리파제를 함께 본다. 리파제가 췌장 특이도가 더 높다고 배운다.",
        [
            "CK·트로포닌은 심근 손상 축이다.",
            "ALT·GGT는 간담도 축이다.",
            "TSH·FT4는 갑상선 기능 축이다.",
            "BUN·크레아티닌은 신기능 축이다.",
        ],
    ),
    "cc13": (
        "심근 손상",
        ["간세포 손상", "사구체 여과 저하", "혈당 조절 상태", "ABO 혈액형 변화"],
        "트로포닌은 심근 손상에 특이적인 표지로 급성관동맥증후군 평가에 쓴다.",
        [
            "간세포 손상은 ALT·AST로 주로 본다.",
            "사구체 여과는 크레아티닌·eGFR로 본다.",
            "혈당 조절은 혈당·HbA1c로 본다.",
            "혈액형은 수혈검사로 확인하며 트로포닌과 무관하다.",
        ],
    ),
    "cc16": (
        "부정맥",
        ["시력 저하", "청력 저하", "미각 저하", "피부 색소 침착"],
        "고칼륨혈증은 심장 전도에 영향을 주어 부정맥 위험이 크다. 응급 전해질로 다룬다.",
        [
            "시력 저하는 고칼륨의 대표 위험이 아니다.",
            "청력 저하는 고칼륨의 대표 위험이 아니다.",
            "미각 저하는 고칼륨의 대표 위험이 아니다.",
            "색소 침착은 고칼륨의 급성 위험 소견이 아니다.",
        ],
    ),
    "cc17": (
        "부갑상선호르몬(PTH)",
        ["인슐린", "글루카곤", "에리트로포이에틴", "항이뇨호르몬(ADH)"],
        "혈중 칼슘 조절에 직접적인 핵심 호르몬으로 부갑상선호르몬(PTH)을 배운다. 비타민 D와 함께 골·신장·장 축을 본다.",
        [
            "인슐린은 혈당 조절 호르몬이다.",
            "글루카곤은 혈당 상승 호르몬이다.",
            "에리트로포이에틴은 조혈 자극 인자이다.",
            "ADH는 수분 재흡수·삼투 조절에 관여한다.",
        ],
    ),
    "cc23": (
        "빌리루빈",
        ["나트륨", "염소", "칼륨", "중탄산 이온"],
        "빌리루빈은 빛에 분해되기 쉬워 차광 용기가 필요하다.",
        [
            "나트륨은 일반적으로 차광 필수 항목이 아니다.",
            "염소도 차광이 필수인 대표 항목이 아니다.",
            "칼륨도 차광 필수 항목으로 다루지 않는다.",
            "중탄산은 가스·산염기 취급이 더 중요하며 빌리루빈형 차광의 전형이 아니다.",
        ],
    ),
    "cc24": (
        "Na, K, Cl",
        ["세균 동정", "바이러스 배양", "진균 도말", "기생충 충란"],
        "이온선택전극(ISE)은 나트륨·칼륨·염소 등 전해질 측정에 흔히 쓰인다.",
        [
            "세균 동정은 미생물 검사이다.",
            "바이러스 배양은 미생물·바이러스 검사이다.",
            "진균 도말은 미생물 형태 검사이다.",
            "기생충 충란은 기생충 검사이다.",
        ],
    ),
    "cc32": (
        "델타 체크",
        ["평균(mean)", "최빈값(mode)", "중앙값(median)", "참고범위 재설정"],
        "동일 환자의 연속 결과가 비정상적으로 차이날 때 우선 이름 붙이는 점검은 델타 체크이다.",
        [
            "평균은 집단·QC 통계량이다.",
            "최빈값은 분포의 가장 잦은 값이다.",
            "중앙값은 분포의 가운데 값이다.",
            "참고범위 재설정은 방법·집단 변경 시 검토한다.",
        ],
    ),
    "cc33": (
        "치우침(bias)",
        ["범위(range)", "최빈값", "중앙값", "평균"],
        "참값에서 한쪽으로 치우친 계통오차를 치우침(bias)이라 한다.",
        [
            "범위는 최댓값−최솟값이다.",
            "최빈값은 가장 자주 나온 값이다.",
            "중앙값은 순서통계량의 가운데이다.",
            "평균은 중심경향 지표이지 치우침의 동의어가 아니다.",
        ],
    ),
    "cc34": (
        "1-3s 관리이탈",
        ["2-2s", "R-4s", "10-x", "관리상태(in control)"],
        "Westgard에서 한 점이 평균±3s를 벗어나면 1-3s 규칙으로 관리이탈로 본다.",
        [
            "2-2s는 같은 방향 2s를 연속 2점이 넘는 규칙이다.",
            "R-4s는 같은 런에서 두 점 범위가 4s인 규칙이다.",
            "10-x는 한쪽으로 10점 연속인 규칙이다.",
            "관리상태는 이탈 규칙에 걸리지 않은 상태이다.",
        ],
    ),
    "cc35": (
        "2-2s",
        ["1-3s", "R-4s", "10-x", "in control"],
        "연속 2점이 같은 쪽으로 2s를 넘으면 2-2s 규칙에 해당한다.",
        [
            "1-3s는 한 점이 3s를 넘는 규칙이다.",
            "R-4s는 범위 4s 규칙이다.",
            "10-x는 한쪽 10점 연속이다.",
            "in control은 이탈이 없는 상태이다.",
        ],
    ),
    "cc36": (
        "추세(trend)",
        ["이동(shift)", "1-3s", "in control", "무작위 오차"],
        "관리도가 한 방향으로 점진적으로 올라가는 형태는 추세(trend)로 부른다.",
        [
            "이동(shift)은 갑자기 수준이 바뀌어 유지되는 형태에 가깝다.",
            "1-3s는 단일점 이탈 규칙이다.",
            "in control은 안정 상태이다.",
            "무작위 오차는 방향 없는 산포에 가깝다.",
        ],
    ),
    "cc37": (
        "매일 분석의 안정성을 감시한다",
        ["외부 검사실과만 비교한다", "광고한다", "인력을 감축한다", "기록을 삭제한다"],
        "내부정도관리의 목적은 일상 분석의 정밀도·안정성을 감시하는 것이다.",
        [
            "외부 검사실 비교는 외부정도관리의 목적에 가깝다.",
            "광고는 정도관리 목적이 아니다.",
            "인력 감축이 목적이 아니다.",
            "기록은 보존해야 하며 삭제가 목적이 아니다.",
        ],
    ),
    "cc41": (
        "가볍게 혼화한다",
        ["섞지 않는다", "1시간 진탕한다", "가열한다", "끓인다"],
        "항응고관은 채혈 직후 가볍게 뒤집며 혼화해 첨가제와 혈액을 섞는다.",
        [
            "섞지 않으면 미세응고가 생길 수 있다.",
            "장시간 격렬한 진탕은 용혈을 유발한다.",
            "가열은 단백 변성·용혈을 일으킨다.",
            "끓이면 검체가 파괴된다.",
        ],
    ),
    "cc42": (
        "응고될 때까지 둔다",
        ["즉시 원심한다", "희석한다", "동결한다", "가열한다"],
        "혈청관은 충분히 응고된 뒤 원심해야 피브린 잔류를 줄일 수 있다.",
        [
            "응고 전 즉시 원심하면 피브린이 남을 수 있다.",
            "희석은 일반 혈청 분리 전처치가 아니다.",
            "동결은 일부 특수 보관이며 응고 대체가 아니다.",
            "가열로 응고를 강제하지 않는다.",
        ],
    ),
    "cc45": (
        "신속히 차갑게 처리한다",
        ["실온에 장시간 둔다", "가열한다", "용혈을 권장한다", "빛에 장시간 둔다"],
        "암모니아는 불안정해 차갑게 신속 처리·분석하는 것이 원칙에 가깝다.",
        [
            "실온 장시간 방치는 위증가를 초래할 수 있다.",
            "가열은 부적절하다.",
            "용혈은 간섭을 키운다.",
            "불필요한 광노출·지연을 피한다.",
        ],
    ),
})
# Fix cc46 properly
CC_CURATED["cc46"] = (
    "가스 분압이 왜곡된다",
    ["혈액형이 바뀐다", "요잠혈만 양성이 된다", "HbA1c만 상승한다", "반드시 용혈이 없어진다"],
    "동맥혈가스 검체에 공기가 들어가면 PO2·PCO2 등 가스 분압이 왜곡된다.",
    [
        "혈액형은 공기 혼입으로 바뀌지 않는다.",
        "요잠혈은 요검사 항목이다.",
        "HbA1c는 공기 혼입과 무관하다.",
        "공기 혼입이 용혈을 제거하지는 않는다.",
    ],
)

CC_CURATED["cc47"] = (
    "첨가제 교차오염을 막으려고",
    ["검사 시간을 늘리려고", "라벨 색을 맞추려고", "원심 속도를 높이려고", "시약 로트를 바꾸려고"],
    "채혈 순서를 지키는 이유는 항응고제·응고촉진제 등 첨가제의 교차오염을 줄이기 위해서이다.",
    [
        "순서는 시간을 늘리려는 목적이 아니다.",
        "라벨 색과 채혈 순서는 별개이다.",
        "원심 조건과 채혈 순서는 별개이다.",
        "시약 로트 변경과 채혈 순서는 별개이다.",
    ],
)

CC_CURATED["cc48"] = (
    "보정과 QC를 다시 확인한다",
    ["결과를 무시한다", "임의로 그대로 쓴다", "과거 기록을 삭제한다", "시약 라벨을 제거한다"],
    "시약 로트 변경 후에는 보정과 정도관리를 다시 확인해 성능이 유지되는지 본다.",
    [
        "변경을 무시하면 계통오차를 놓칠 수 있다.",
        "검증 없이 임의 사용은 부적절하다.",
        "기록은 보존해야 한다.",
        "라벨·식별은 유지해야 한다.",
    ],
)

CC_CURATED["cc49"] = (
    "완전 해동 후 섞는다",
    ["반만 해동한다", "끓여서 해동한다", "장시간 실온에 방치한다", "빛에 방치한다"],
    "냉동 검체·시약은 완전히 해동한 뒤 가볍게 섞어 농도를 균일하게 한다. 반복 동결융해를 피한다.",
    [
        "반만 해동하면 농도 불균일이 생긴다.",
        "끓이면 변성·파괴가 일어난다.",
        "장시간 실온 방치는 분해·오염 위험이 있다.",
        "광분해 가능 물질은 빛 노출을 피한다.",
    ],
)

CC_CURATED["cc56"] = (
    "확인 후 즉시 통보한다",
    ["다음날 보고한다", "무시한다", "결과만 삭제한다", "사회관계망에 공개한다"],
    "위급치(패닉값)는 확인 절차 후 즉시 담당자에게 통보하고 기록한다.",
    [
        "지연 보고는 위급치 취급에 맞지 않는다.",
        "무시하면 환자 안전에 위험이 된다.",
        "삭제하면 안 된다.",
        "개인정보를 외부에 공개하면 안 된다.",
    ],
)

CC_CURATED["cc57"] = (
    "용혈·잘못된 관",
    ["램프 노후만", "검출기 고장만", "소프트웨어 오류만", "시약 곡선 이상만"],
    "용혈·채혈관 오선택 등은 분석 전(preanalytical) 오류의 대표 예이다.",
    [
        "램프 노후는 분석 중 기기 문제에 가깝다.",
        "검출기 고장은 분석 중 문제에 가깝다.",
        "소프트웨어 오류는 분석·정보 단계 이슈이다.",
        "시약 곡선 이상은 분석·보정 단계 이슈이다.",
    ],
)

CC_CURATED["cc58"] = (
    "당뇨성 케톤산증 의심",
    ["단순 저혈당 의심", "고나트륨만 의심", "철결핍만 의심", "급성간염만 의심"],
    "케톤 검사는 당뇨성 케톤산증 등 케톤 축적 상태를 의심할 때 쓴다.",
    [
        "단순 저혈당 평가의 1차 검사가 아니다.",
        "나트륨만의 이상은 전해질 검사로 본다.",
        "철결핍은 철 패널로 본다.",
        "급성간염은 간효소·빌리루빈 등으로 본다.",
    ],
)

CC_CURATED["cc59"] = (
    "항원-항체 반응",
    ["효소활성 측정만", "이온선택전극만", "전기영동만", "원자흡광만"],
    "hCG 임신반응은 항원-항체 반응에 기반한 면역측정이다.",
    [
        "효소활성 비색만으로 설명하지 않는다.",
        "ISE는 전해질 측정 원리이다.",
        "전기영동은 단백 분획 등에 쓴다.",
        "원자흡광은 금속 분석에 쓴다.",
    ],
)

CC_CURATED["cc60"] = (
    "심부전 보조 표지",
    ["급성간염 확진", "요로결석 확진", "용혈 확진", "철결핍 확진"],
    "BNP/NT-proBNP는 호흡곤란 감별에서 심부전을 보조하는 표지로 배운다.",
    [
        "간염은 간효소·항원항체 등으로 본다.",
        "결석은 영상·요검사 등으로 본다.",
        "용혈은 빌리루빈·LD·합토글로빈 등으로 본다.",
        "철결핍은 철·페리틴 등으로 본다.",
    ],
)

# ======================== Neighbor pools by correct-answer class ========================
NEIGHBORS = {
    "칼륨(K+)": ["나트륨(Na+)", "염소(Cl−)", "중탄산(HCO3−)", "마그네슘(Mg2+)"],
    "ALT": ["AST", "ALP", "GGT", "LD"],
    "AST": ["ALT", "ALP", "CK", "LD"],
    "GGT": ["ALP", "ALT", "AST", "CK"],
    "ALP": ["GGT", "ALT", "AST", "CK"],
    "CK": ["LD", "AST", "ALT", "트로포닌"],
    "트로포닌": ["CK-MB", "미오글로빈", "BNP", "CRP"],
    "아밀라제와 리파제": ["ALT와 AST", "BUN과 크레아티닌", "TSH와 FT4", "CK와 트로포닌"],
    "리파제(lipase)": ["아밀라제", "ALT", "ALP", "CK"],
    "1-3s 관리이탈": ["2-2s", "R-4s", "10-x", "4-1s"],
    "2-2s": ["1-3s", "R-4s", "10-x", "in control"],
    "추세(trend)": ["이동(shift)", "무작위 오차", "1-3s", "in control"],
    "델타 체크": ["패닉값 통보", "평균", "참고범위", "보정"],
    "치우침(bias)": ["정밀도 저하", "무작위 오차", "범위", "평균"],
    "거대적아구성 빈혈": ["철결핍빈혈", "지중해빈혈", "만성질환빈혈", "급성실혈"],
    "소구성 저색소성": ["대구성 정색소성", "정구성 정색소성", "대구성 저색소성", "소구성 정색소성"],
    "적혈구 크기 불균일": ["적혈구 수 감소", "혈색소 농도 저하", "망상적혈구 증가", "혈구용적 증가"],
    "조혈 증가": ["조혈 감소", "골수 정지", "단순 농축", "수혈 후 희석"],
    "매염": ["1차 염색", "탈색", "대비염색", "수세"],
    "Catalase 양성": ["Oxidase 양성", "Coagulase 양성", "Urease 양성", "Indole 양성"],
    "Coagulase 양성": ["Catalase 양성", "Oxidase 양성", "Urease 양성", "Indole 양성"],
    "발생률(incidence)": ["유병률(prevalence)", "치명률(case fatality)", "조사망률", "비례사망비"],
    "유병률(prevalence)": ["발생률(incidence)", "치명률(case fatality)", "영아사망률", "모성사망비"],
    "10년": ["2년", "3년", "5년", "20년"],
    "2년": ["1년", "3년", "5년", "10년"],
    "5년": ["2년", "3년", "10년", "15년"],
    "A 항원": ["B 항원", "A와 B 항원", "H 항원 결손", "D 항원"],
    "항-B": ["항-A", "항-D", "항-A,B", "항-H"],
    "항-A": ["항-B", "항-D", "항-AB", "항체 없음"],
    "심방 탈분극": ["심실 탈분극", "심실 재분극", "심방 재분극", "방실 전도"],
    "10% 중성완충포르말린": ["무수 에탄올", "부앵액", "글루타르알데히드", "젠커액"],
    "약 4%": ["약 10%", "약 20%", "약 37–40%", "약 1%"],
    "탈칼슘": ["탈수", "투명", "포매", "탈파라핀"],
    "그람양성 구균": ["그람음성 구균", "그람양성 간균", "그람음성 간균", "항산균 간균"],
    "그람음성 간균": ["그람양성 간균", "그람음성 구균", "그람양성 구균", "항산균 양성"],
}

SUBJECT_POOLS = {
    "cc": ["분석 전 오차", "치우침(bias)", "정밀도 저하", "델타 체크", "위급치 통보",
           "내부정도관리", "외부정도관리", "보정(calibration)", "용혈 간섭", "유미 간섭",
           "황달 간섭", "공복 채혈", "차광 채혈", "신속 냉장", "첨가제 교차오염"],
    "he": ["소구성 저색소성", "대구성", "정구성 정색소성", "망상적혈구 증가", "좌방이동",
           "호중구 감소", "혈소판 감소", "PT 연장", "aPTT 연장", "D-이합체 증가"],
    "it": ["전방형", "후방형", "주교차", "부교차", "항체선별",
           "항글로불린검사", "효소법", "냉항체", "온항체", "RhIg"],
    "mb": ["그람양성 구균", "그람음성 간균", "항산균", "효모", "혐기성 간균",
           "Catalase", "Oxidase", "Coagulase", "Urease", "Indole"],
    "hp": ["고정", "탈수", "투명", "침투", "박절", "H&E", "PAS", "Congo red", "GMS", "IHC"],
    "ph": ["심방 탈분극", "심실 탈분극", "심실 재분극", "표준 감도", "접지",
           "努力性 호기", "재현성", "교정 펄스", "유도 부착", "안정 시 기록"],
    "ml": ["2년", "3년", "5년", "10년", "신고", "자격정지", "면허취소", "과태료", "벌칙", "교육"],
    "pb": ["발생률", "유병률", "치명률", "조사망률", "영아사망률",
           "1차예방", "2차예방", "3차예방", "상하수도", "예방접종"],
    "prac": ["그람양성 구균", "그람음성 간균", "분쇄적혈구", "표적세포", "낫적혈구",
             "응집(+)", "응집(−)", "M단백", "관리이탈", "정상 분획"],
}

JUNK_EXTRA = re.compile(
    r"관련 항목|우선 본다|라고 본다|만으로 충분|무관해서|색만|향만|가격만|"
    r"점심|벽색|조명|미관|습관만|게임|광고|삭제 관련|식별 생략|보호구 금지|"
    r"가스여서|금속이어서|지방만|물에 잘 녹아서|가열한다|끓인다|"
    r"세균만 보인다|바이러스만 보인다|혈액형을 보|키만|시력만|청력만|옷색만|"
    r"A형 관련|B형 관련|O형 관련|AB형 관련|2년 관련|"
    r"혈당을 올려서|칼륨을 올려서|빌리루빈을 올려서|"
    r"외막만 있어서|지질다당만|핵만 있어서|편모만 있어서|"
    r"안경 착용|왼손잡이|키 170|가벼운 대화|코집게가 금지|설명이 불필요|"
    r"한 번만 하면|약하게만 불|자세가 무관|강제한다고|위조를 허용|"
    r"비밀을 공개|맛$|향만$|무게만$|추측$|삭제$|식별 생략$|보호구 금지"
)

def file_prefix(name: str) -> str:
    if name.startswith("cc"): return "cc"
    if name.startswith("he"): return "he"
    if name.startswith("it"): return "it"
    if name.startswith("mb"): return "mb"
    if name.startswith("hp"): return "hp"
    if name.startswith("ph"): return "ph"
    if name.startswith("medical"): return "ml"
    if name.startswith("public"): return "pb"
    if name.startswith("practical"): return "prac"
    if name.startswith("anatomy"): return "an"
    return "cc"

def is_junk(c: str) -> bool:
    c = (c or "").strip()
    if not c:
        return True
    if JUNK_CHOICE.search(c) or JUNK_EXTRA.search(c):
        return True
    if c.endswith("만") and ulen(c) <= 8:
        return True
    if "은(는)" in c or "이(가)" in c or "과(와)" in c:
        return True
    return False

def same_category_score(a: str, b: str) -> int:
    """Rough heuristic: shared tokens / similar length."""
    if not a or not b:
        return 0
    ta = set(re.findall(r"[A-Za-z0-9+\-]+|[가-힣]{2,}", a))
    tb = set(re.findall(r"[A-Za-z0-9+\-]+|[가-힣]{2,}", b))
    inter = len(ta & tb)
    la, lb = ulen(a), ulen(b)
    len_pen = abs(la - lb)
    return inter * 3 - len_pen // 4

def pick_neighbors(correct: str, prefix: str, need: int, used: set) -> list[str]:
    out = []
    for src in (NEIGHBORS.get(correct, []), SUBJECT_POOLS.get(prefix, [])):
        for cand in src:
            if cand != correct and cand not in used and cand not in out and not is_junk(cand):
                out.append(cand)
            if len(out) >= need:
                return out
    # synthesize mild variants
    fillers = [
        f"{correct}와 인접한 다른 지표",
        "같은 패널의 다른 항목",
        "혼동하기 쉬운 유사 소견",
        "다른 단계의 관련 소견",
        "참고범위 내 정상 소견",
    ]
    # Avoid meta fillers if possible — use subject pool repeats with suffix
    pool = SUBJECT_POOLS.get(prefix, [])
    i = 0
    while len(out) < need and i < 20:
        if pool:
            cand = pool[i % len(pool)]
            alt = cand if cand not in used and cand != correct else f"{cand}(유사 오개념)"
            if alt not in used and alt != correct and alt not in out:
                out.append(alt)
        i += 1
    while len(out) < need:
        out.append(fillers[len(out) % len(fillers)])
    return out[:need]

def apply_curated(q: dict, pack: tuple) -> dict:
    correct, wrongs, ec, ews = pack
    ai = q["answerIndex"]
    choices = [None] * 5
    ew = [""] * 5
    wi = 0
    for i in range(5):
        if i == ai:
            choices[i] = correct
            ew[i] = ""
        else:
            choices[i] = wrongs[wi]
            ew[i] = ews[wi]
            wi += 1
    q["choices"] = choices
    q["explainCorrect"] = ec
    q["explainWrong"] = ew
    return q

def natural_ec(core: str, correct: str, stem: str) -> str:
    core = strip_ec_core(core) or ""
    # remove leftover wrong-tip fragments glued into ec
    core = re.sub(r"[^.가-힣A-Za-z0-9 +/−μ%\-\(\)]{0,0}", "", core)
    sentences = [s.strip() for s in re.split(r"(?<=다\.)\s*", core) if s.strip()]
    sentences = [s for s in sentences if "인접" not in s and "배제" not in s][:3]
    if not sentences:
        sentences = [f"이 문항에서 묻는 내용에 가장 잘 맞는 것은 {correct}이다."]
    # Expand to 2–4 sentences without template
    text = " ".join(sentences)
    if ulen(text) < 40:
        text += f" 선택지 중에서는 {correct}이 정의와 임상 적용에 부합한다."
    if ulen(text) < 70:
        text += " 나머지 선택지는 인접 개념이거나 다른 검사 상황의 설명이다."
    # kill particle artifacts
    text = text.replace("은(는)", "은").replace("이(가)", "이").replace("과(와)", "과")
    text = re.sub(r"따라서 정답은 「.*?」이다\.?", "", text)
    text = re.sub(r"이 개념을 선택지에 옮기면 「.*?」이 정답이다\.?", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    # avoid ending with incomplete
    if text and text[-1] not in ".!?":
        text += "."
    return text

def natural_ew(tip: str, choice: str, correct: str) -> str:
    tip = strip_ew_tip(tip)
    tip = tip.replace("은(는)", "은").replace("이(가)", "이").replace("과(와)", "과")
    if tip and "정답이 아니다" not in tip and ulen(tip) >= 8:
        if tip[-1] not in ".!?":
            tip += "."
        # make specific
        if choice[:6] not in tip and ulen(tip) < 60:
            return f"{choice}은 {tip.rstrip('.')}의 설명에 해당하지 않는다."
        return tip
    # generate
    if is_junk(choice):
        return f"{choice}은 이 문항의 개념 범주와 맞지 않는 오답으로, {correct}와 같은 층위에서 비교할 수 없다."
    return f"{choice}은 {correct}와 혼동하기 쉬운 인접 개념이지만, 문항의 조건·정의에는 부합하지 않는다."

def balance_lengths(choices: list[str], ai: int) -> list[str]:
    """If correct is much longer, trim parenthetical; if wrongs have 만 tell, soft-fix."""
    out = list(choices)
    c = out[ai]
    wrong_lens = [ulen(out[i]) for i in range(5) if i != ai]
    med = sorted(wrong_lens)[len(wrong_lens)//2] if wrong_lens else ulen(c)
    if ulen(c) > med * 1.6 and ulen(c) - med >= 6:
        # shorten correct slightly if has long paren
        c2 = re.sub(r"（.*?）|\(.*?\)", "", c).strip()
        if ulen(c2) >= 4 and ulen(c2) < ulen(c):
            out[ai] = c2
    for i in range(5):
        if i == ai:
            continue
        if out[i].endswith("만") and not out[ai].endswith("만"):
            # remove trailing 만
            out[i] = out[i][:-1] if ulen(out[i]) > 2 else out[i]
    return out

def fix_choices(q: dict, fname: str) -> tuple[dict, bool]:
    ai = q["answerIndex"]
    correct = q["choices"][ai]
    prefix = file_prefix(fname)
    changed = False
    new_choices = list(q["choices"])

    def bad_choice(c: str) -> bool:
        if is_junk(c) or c == correct:
            return True
        # absolute words only on wrongs (soft)
        if ABS_RE.search(c) and not ABS_RE.search(correct):
            # only flag if choice is short absolute slogan
            if ulen(c) <= 12:
                return True
        if ulen(c) <= 2:
            return True
        return False

    # Seed used with keepers first so replacements cannot collide
    used = {correct}
    to_replace = []
    for i, c in enumerate(new_choices):
        if i == ai:
            continue
        if bad_choice(c):
            to_replace.append(i)
        else:
            used.add(c)

    for i in to_replace:
        repls = pick_neighbors(correct, prefix, 6, used)
        repl = None
        for cand in repls:
            if cand not in used and cand != correct:
                repl = cand
                break
        if repl is None:
            # last resort unique filler in-category
            n = 1
            while True:
                cand = f"{correct}와 구분되는 소견 {n}"
                if cand not in used:
                    repl = cand
                    break
                n += 1
        new_choices[i] = repl
        used.add(repl)
        changed = True

    new_choices = balance_lengths(new_choices, ai)
    # final dedupe pass
    seen = set()
    for i, c in enumerate(new_choices):
        if i == ai:
            seen.add(c)
            continue
        if c in seen:
            repls = pick_neighbors(correct, prefix, 8, seen | {correct})
            for cand in repls:
                if cand not in seen and cand != correct:
                    new_choices[i] = cand
                    changed = True
                    break
            else:
                new_choices[i] = f"인접 오개념 {i+1}"
                changed = True
        seen.add(new_choices[i])

    if new_choices != q["choices"]:
        changed = True
    q["choices"] = new_choices
    return q, changed

def fix_explanations(q: dict) -> dict:
    ai = q["answerIndex"]
    correct = q["choices"][ai]
    core = strip_ec_core(q.get("explainCorrect", ""))
    q["explainCorrect"] = natural_ec(core, correct, q.get("stem", ""))
    ew = list(q.get("explainWrong") or [""] * 5)
    while len(ew) < 5:
        ew.append("")
    for i in range(5):
        if i == ai:
            ew[i] = ""
        else:
            ew[i] = natural_ew(ew[i], q["choices"][i], correct)
            # kill remaining templates
            ew[i] = TEMPLATE_EW.sub("", ew[i])
            ew[i] = ew[i].replace("은(는)", "은").replace("이(가)", "이").replace("과(와)", "과")
            ew[i] = re.sub(r"\s+", " ", ew[i]).strip()
            if ew[i] and ew[i][-1] not in ".!?":
                ew[i] += "."
    q["explainWrong"] = ew
    return q

def process_file(path: Path, counts: dict) -> int:
    arr = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(arr, list):
        return 0
    nfix = 0
    for q in arr:
        qid = q["id"]
        before = json.dumps(q, ensure_ascii=False)
        if qid in CC_CURATED:
            apply_curated(q, CC_CURATED[qid])
            nfix += 1
        else:
            q, ch = fix_choices(q, path.name)
            fix_explanations(q)
            if ch or before != json.dumps(q, ensure_ascii=False):
                nfix += 1
        # validate
        assert len(q["choices"]) == 5, qid
        assert q["explainWrong"][q["answerIndex"]] == ""
        assert len(set(q["choices"])) == 5, (qid, q["choices"])
    path.write_text(json.dumps(arr, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    counts[path.name] = nfix
    return nfix

def main():
    counts = {}
    total = 0
    # Skip anatomy unless templated — handle specially
    files = sorted(DATA.glob("*.json"))
    for path in files:
        if path.name == "histopathology-existing.json":
            continue
        if path.name == "anatomy.json":
            # leave anatomy choices; only strip if templates appear
            arr = json.loads(path.read_text(encoding="utf-8"))
            n = 0
            for q in arr:
                if TEMPLATE_EC.search(q.get("explainCorrect", "")) or TEMPLATE_EW.search(" ".join(q.get("explainWrong") or [])):
                    fix_explanations(q)
                    n += 1
            if n:
                path.write_text(json.dumps(arr, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            counts[path.name] = n
            total += n
            continue
        total += process_file(path, counts)
    print(json.dumps({"fixedApprox": counts, "sum": total}, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
