// 코인 정보 매핑
const coinMap = {
    'KRW-BTC': { name: '비트코인', code: 'BTC' },
    'KRW-ETH': { name: '이더리움', code: 'ETH' },
    'KRW-XRP': { name: '리플', code: 'XRP' },
    'KRW-DOGE': { name: '도지코인', code: 'DOGE' },
    'KRW-SOL': { name: '솔라나', code: 'SOL' }
};

// 업비트 API에서 데이터 가져오기
async function fetchCoinData() {
    try {
        // [수정 후] 12번째 줄
        const response = await fetch('/api/upbit/ticker?markets=KRW-BTC,KRW-ETH,KRW-XRP,KRW-DOGE,KRW-SOL');
        const data = await response.json();
        
        // API 응답 데이터를 coinData 형식으로 변환
        const coinData = data.map(item => {
            const coinInfo = coinMap[item.market];
            const changeRate = item.signed_change_rate * 100; // 소수점을 퍼센트로 변환
            
            // 거래대금 포맷팅 (억 단위)
            const volume24h = item.acc_trade_price_24h;
            const volumeInEok = (volume24h / 100000000).toFixed(0);
            
            return {
                name: coinInfo.name,
                code: coinInfo.code,
                price: item.trade_price,
                kimp: 0, // 김프는 별도 계산 필요 (일단 0으로 설정)
                change: changeRate,
                volume: `${volumeInEok}억`
            };
        });
        
        return coinData;
    } catch (error) {
        console.error('데이터 가져오기 실패:', error);
        return [];
    }
}

// 테이블 렌더링 함수
function renderTable(coinData) {
    const tbody = document.getElementById('coinTableBody');
    tbody.innerHTML = ''; // 기존 내용 초기화
    
    coinData.forEach(coin => {
        const tr = document.createElement('tr');
        
        // 코인명 셀
        const nameCell = document.createElement('td');
        nameCell.className = 'coin-name';
        nameCell.innerHTML = `
            <div class="coin-info">
                <div class="coin-icon">${coin.code}</div>
                <div>
                    <div class="coin-symbol">${coin.name}</div>
                    <div class="coin-code">${coin.code}</div>
                </div>
            </div>
        `;
        
        // 현재가 셀
        const priceCell = document.createElement('td');
        priceCell.className = 'price';
        priceCell.textContent = Math.round(coin.price).toLocaleString();
        
        // 김프 셀
        const kimpCell = document.createElement('td');
        const kimpClass = coin.kimp >= 0 ? 'positive' : 'negative';
        const kimpSign = coin.kimp >= 0 ? '+' : '';
        kimpCell.className = `kimp ${kimpClass}`;
        kimpCell.textContent = `${kimpSign}${coin.kimp.toFixed(2)}%`;
        
        // 전일대비 셀
        const changeCell = document.createElement('td');
        const changeClass = coin.change >= 0 ? 'positive' : 'negative';
        const changeSign = coin.change >= 0 ? '+' : '';
        changeCell.className = `change ${changeClass}`;
        changeCell.textContent = `${changeSign}${coin.change.toFixed(2)}%`;
        
        // 거래대금 셀
        const volumeCell = document.createElement('td');
        volumeCell.className = 'volume';
        volumeCell.textContent = coin.volume;
        
        // 행에 셀들 추가
        tr.appendChild(nameCell);
        tr.appendChild(priceCell);
        tr.appendChild(kimpCell);
        tr.appendChild(changeCell);
        tr.appendChild(volumeCell);
        
        // 테이블에 행 추가
        tbody.appendChild(tr);
    });
}

// 시세 갱신 함수
async function updateCoinData() {
    const coinData = await fetchCoinData();
    if (coinData.length > 0) {
        renderTable(coinData);
    }
}

// Firebase 초기화
const firebaseConfig = {
    apiKey: "AIzaSyBkTzrqJNwZREpC7X_-_MZ5xxieJv5UM1g",
    authDomain: "mykimpchat.firebaseapp.com",
    databaseURL: "https://mykimpchat-default-rtdb.firebaseio.com",
    projectId: "mykimpchat",
    storageBucket: "mykimpchat.firebasestorage.app",
    messagingSenderId: "664297547752",
    appId: "1:664297547752:web:06f49838b5111f8df7e65d"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// 채팅 기능 구현
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const messagesRef = database.ref('messages');

// 메시지 전송 함수
function sendMessage() {
    const message = chatInput.value.trim();
    
    if (message === '') {
        return;
    }
    
    // 현재 시간 가져오기
    const now = new Date();
    const timestamp = now.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    // Firebase에 메시지 저장
    messagesRef.push({
        nickname: '익명',
        message: message,
        timestamp: timestamp,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    });
    
    // 입력창 비우기
    chatInput.value = '';
}

// 스크롤을 맨 아래로 이동하는 함수
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Firebase에서 새 메시지 받기
messagesRef.on('child_added', (snapshot) => {
    const data = snapshot.val();
    
    // 메시지 요소 생성
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    
    // 메시지 내용 구성
    const messageText = `[${data.timestamp}] ${data.nickname}: ${data.message}`;
    messageElement.textContent = messageText;
    
    // 채팅 목록에 추가
    chatMessages.appendChild(messageElement);
    
    // 스크롤을 맨 아래로 이동
    scrollToBottom();
});

// 전송 버튼 클릭 이벤트
sendButton.addEventListener('click', sendMessage);

// Enter 키 입력 이벤트
chatInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// 페이지 로드 시 초기 데이터 로드
window.addEventListener('load', function() {
    updateCoinData();
    
    // 1초마다 시세 갱신
    setInterval(updateCoinData, 1000);
});

