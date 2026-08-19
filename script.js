const makerIdInput = document.getElementById('makerId');
const streakInput = document.getElementById('streakCount');
const saveIdBtn = document.getElementById('saveIdBtn');
const clearCacheBtn = document.getElementById('clearCacheBtn');
const loseStreakMask = document.getElementById('loseStreakMask');

const tabBattleBtn = document.getElementById('tabBattleBtn');
const tabMakerBtn = document.getElementById('tabMakerBtn');
const battleContent = document.getElementById('battleContent');
const makerContent = document.getElementById('makerContent');

let globalVersusWon = 0;
let globalTotalPlayed = 0;

// タブ切り替え処理
tabBattleBtn.addEventListener('click', () => {
  tabBattleBtn.classList.add('active');
  tabMakerBtn.classList.remove('active');
  battleContent.style.display = 'block';
  makerContent.style.display = 'none';
});

tabMakerBtn.addEventListener('click', () => {
  tabMakerBtn.classList.add('active');
  tabBattleBtn.classList.remove('active');
  makerContent.style.display = 'block';
  battleContent.style.display = 'none';
});

// キャッシュ状態をチェックして削除ボタンの表示・非表示を切替
function checkCacheState() {
  const savedId = localStorage.getItem('savedMakerId');
  if (savedId) {
    clearCacheBtn.style.display = 'inline-block';
  } else {
    clearCacheBtn.style.display = 'none';
  }
}

// 初期化
window.addEventListener('DOMContentLoaded', () => {
  const savedId = localStorage.getItem('savedMakerId');
  if (savedId) {
    makerIdInput.value = savedId;
  }
  checkCacheState();
});

// リアルタイムでハイフン「-」および「ー」を除去
makerIdInput.addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/[-ー]/g, '');
});

// 黒塗り連敗数マスクのクリックイベント
loseStreakMask.addEventListener('click', () => {
  loseStreakMask.classList.toggle('revealed');
});

// 職人IDを保存するボタン
saveIdBtn.addEventListener('click', () => {
  const makerId = makerIdInput.value.replace(/[-ー]/g, '').trim();
  if (makerId) {
    localStorage.setItem('savedMakerId', makerId);
    checkCacheState();
    alert('職人IDを記憶しました！');
  }
});

// キャッシュを削除するボタン
clearCacheBtn.addEventListener('click', () => {
  localStorage.removeItem('savedMakerId');
  makerIdInput.value = '';
  checkCacheState();
  alert('記憶した職人ID（キャッシュ）を削除しました。');
});

// バトルランクと現在のレートから「次のランク」と「目標レート」を計算する関数
function getNextRankInfo(currentRank, rating) {
  const rankThresholds = [
    { rank: 'D', nextRank: 'C', target: 1000 },
    { rank: 'C', nextRank: 'B', target: 2000 },
    { rank: 'B', nextRank: 'A', target: 3000 },
    { rank: 'A', nextRank: 'S', target: 4000 },
    { rank: 'S', nextRank: 'S+', target: 5000 }
  ];

  const currentInfo = rankThresholds.find(item => item.rank.toUpperCase() === currentRank.toUpperCase());

  if (currentInfo) {
    const diff = currentInfo.target - rating;
    return {
      nextRank: currentInfo.nextRank,
      needed: diff > 0 ? diff : 0
    };
  } else if (currentRank.toUpperCase() === 'S+') {
    return {
      nextRank: '最高ランク',
      needed: 0
    };
  } else {
    const nextTarget = Math.ceil((rating + 1) / 1000) * 1000;
    return {
      nextRank: '上位ランク',
      needed: nextTarget - rating
    };
  }
}

// 勝率と連勝率を再計算して表示する関数
function updateCalculations() {
  const winRateMsg = document.getElementById('winRateMsg');
  const streakWinRateMsg = document.getElementById('streakWinRateMsg');

  const streakCount = parseInt(streakInput.value, 10) || 1;
  const winRatio = globalVersusWon / globalTotalPlayed;

  const winRate = winRatio * 100;
  const streakRatio = Math.pow(winRatio, streakCount);
  const streakWinRate = streakRatio * 100;

  winRateMsg.textContent = `勝率: ${winRate.toFixed(2)}%`;
  streakWinRateMsg.textContent = `${streakCount}連勝の勝率: ${streakWinRate.toFixed(4)}%`;
}

// 連勝数の数値が変わったときに自動で再計算
streakInput.addEventListener('input', () => {
  if (globalTotalPlayed > 0) {
    updateCalculations();
  }
});

document.getElementById('calcBtn').addEventListener('click', async () => {
  const makerId = makerIdInput.value.replace(/[-ー]/g, '').trim();

  const errorMsg = document.getElementById('errorMsg');
  const resultBox = document.getElementById('resultBox');

  errorMsg.textContent = '';
  resultBox.style.display = 'none';

  if (!makerId) {
    errorMsg.textContent = '職人IDを入力してください。';
    return;
  }

  try {
    const response = await fetch(`https://tgrcode.com/mm2/user_info/${makerId}`);
    if (!response.ok) {
      throw new Error('API Error');
    }

    const rawText = await response.text();

    // 抽出処理
    const miiImageMatch = rawText.match(/"mii_image":\s*"([^"]+)"\s*,"mii_studio_code/);
    const nameMatch = rawText.match(/"name":\s*"([^"]+)"\s*,"country/);
    const ratingMatch = rawText.match(/"versus_rating":\s*(\d+)\s*,"versus_rank/);
    const rankMatch = rawText.match(/"versus_rank_name":\s*"([^"]+)"\s*,"versus_won/);
    const wonMatch = rawText.match(/"versus_won":\s*(\d+)\s*,"versus_lost/);
    const lostMatch = rawText.match(/"versus_lost":\s*(\d+)\s*,"versus_win_streak/);
    const winStreakMatch = rawText.match(/"versus_win_streak":\s*(\d+)\s*,"versus_lose_streak/);
    const loseStreakMatch = rawText.match(/"versus_lose_streak":\s*(\d+)\s*,"versus_plays":/);

    if (!wonMatch || !lostMatch || !ratingMatch || !rankMatch || !nameMatch || !miiImageMatch || !winStreakMatch || !loseStreakMatch) {
      errorMsg.textContent = '職人IDが間違ってるか、存在しません。';
      return;
    }

    // 値の取得
    const miiImageUrl = miiImageMatch[1];
    const userName = nameMatch[1];
    const rating = parseInt(ratingMatch[1], 10);
    const rankName = rankMatch[1];
    const winStreak = parseInt(winStreakMatch[1], 10);
    const loseStreak = parseInt(loseStreakMatch[1], 10);

    globalVersusWon = parseInt(wonMatch[1], 10);
    const versusLost = parseInt(lostMatch[1], 10);
    globalTotalPlayed = globalVersusWon + versusLost;

    if (globalTotalPlayed === 0) {
      errorMsg.textContent = 'プレイ回数が0回のため計算できません。';
      return;
    }

    // UIへの流し込み
    document.getElementById('miiImage').src = miiImageUrl;
    document.getElementById('userName').textContent = userName;
    document.getElementById('ratingMsg').textContent = `今のレート: ${rating}`;
    document.getElementById('rankMsg').textContent = `今のバトルランク: ${rankName}`;
    document.getElementById('winStreakMsg').textContent = `現在、${winStreak}連勝中`;

    // 連敗数の黒塗りリセット
    loseStreakMask.textContent = loseStreak;
    loseStreakMask.classList.remove('revealed');

    // 通算戦績の流し込み
    document.getElementById('totalPlayedMsg').textContent = `プレイした回数: ${globalTotalPlayed}回`;
    document.getElementById('totalWonMsg').textContent = `勝った回数: ${globalVersusWon}回`;

    // 次のバトルランク計算
    const nextRankInfo = getNextRankInfo(rankName, rating);
    const nextRankMsg = document.getElementById('nextRankMsg');

    if (rankName.toUpperCase() === 'S+') {
      nextRankMsg.textContent = '最高ランク(S+)に到達しています！';
    } else {
      nextRankMsg.textContent = `次のバトルランクアップ(${nextRankInfo.nextRank})まで: ${nextRankInfo.needed}レート`;
    }

    // 計算成功時に「職人IDを記憶する」ボタンを表示
    saveIdBtn.style.display = 'inline-block';

    // デフォルトで「みんバト」タブをアクティブにする
    tabBattleBtn.click();

    // 勝率計算の実行と表示
    updateCalculations();
    resultBox.style.display = 'block';

  } catch (err) {
    errorMsg.textContent = '職人IDが間違ってるか、存在しません。';
  }
});
