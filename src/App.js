import React, { useEffect, useState, useRef } from 'react';
import socket from './socket';
import './App.css';
import { getUser } from './UserService';
import { useNavigate } from 'react-router-dom';
import { playSound, stopSound } from './utils/tools';

function App() {
    const [players, setPlayers] = useState([]);
    const [myCards, setMyCards] = useState([]);
    const [playedCards, setPlayedCards] = useState([]);
    const [currentTurn, setCurrentTurn] = useState(null);
    const [gameStarted, setGameStarted] = useState(false);
    const [myId] = useState(() => {
        const user = JSON.parse(localStorage.getItem('user')) || {};
        return user._id || user.id || '';
    }); // Sửa: luôn lấy từ userId, không lấy từ socket.id
    const [roomId, setRoomId] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [playerName, setPlayerName] = useState('new ' + Math.floor(Math.random() * 1000));
    const [selectedCards, setSelectedCards] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState(true);
    const [hasPassedThisRound, setHasPassedThisRound] = useState(false);
    const [finishedPlayers, setFinishedPlayers] = useState([]); // ✅ Thêm
    const [showRanking, setShowRanking] = useState(false); // ✅ Hiển thị thứ hạng
    const [myScore, setMyScore] = useState(0);
    const [dealing, setDealing] = useState(false); // Thêm state hiệu ứng chia bài
    const [firstTurnPlayerId, setFirstTurnPlayerId] = useState(null); // Thêm state lưu người đánh đầu tiên
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const token = user.token || '';
    const userId = user._id || user.id || '';
    const navigate = useNavigate();
    const tableRef = useRef(null);
    const tableContentRef = useRef(null); // Thêm ref cho table-content
    const avatarRefs = useRef({}); // Lưu ref tới avatar từng người chơi

    // State để lưu hiệu ứng đánh bài
    const [flyingCards, setFlyingCards] = useState([]);
    // Thêm state lưu các lá bài bản thân chuẩn bị đánh (để hiệu ứng flying card)
    const [pendingMyPlayCards, setPendingMyPlayCards] = useState(null);

    useEffect(() => {
        async function fetchUser() {
            const res = await getUser(userId, token);
            if (res && res._id) setPlayerName(res.name);
        }
        fetchUser();
    }, [userId, token]);

    useEffect(() => {
        function onRoomCreated({ roomId }) {
            setRoomId(roomId);
            setPlayers([]);
            setGameStarted(false);
            setPlayedCards([]);
            setMyCards([]);

            getUser(myId, token).then(userInfo => {
                setPlayers([{
                    id: myId,
                    name: userInfo.name,
                    isReady: false,
                    cardCount: 13,
                    score: userInfo.score,
                    image: userInfo.image
                }]);
            });
        }

        function onJoinedRoom({ roomId, players }) {
            setRoomId(roomId);
            setPlayers(players || []);
            setGameStarted(false);
            setPlayedCards([]);
            setMyCards([]);
            setCurrentTurn(null);
            setSelectedCards([]);
            setHasPassedThisRound(false);
            // Đừng reset finishedPlayers và showRanking ở đây nữa!
            // setFinishedPlayers([]);
            // setShowRanking(false);
        }

        function onStartGame(data) {
            setGameStarted(true);
            setPlayers(data.players || []);
            setPlayedCards([]);
            setCurrentTurn(data.currentTurn);
            setHasPassedThisRound(false);
            setFinishedPlayers([]); // <-- Reset xếp hạng khi bắt đầu ván mới
            setShowRanking(false);  // <-- Ẩn bảng xếp hạng khi bắt đầu ván mới
            setDealing(true);
            playSound('deal');

            setFirstTurnPlayerId(data.currentTurn);
            setTimeout(() => {
                setMyCards(data.hand || []);
                stopSound('deal'); // Dừng âm thanh chia bài
                setDealing(false);
            }, 3000);
        }

        function onYourTurn({ playerId }) {
            setCurrentTurn(playerId);
            if (playerId === myId) setHasPassedThisRound(false);
        }

        function onPassTurn({ playerId }) {
            playSound('passTurn'); // <-- Phát âm thanh khi bất kỳ ai bỏ qua
        }

        function onPlayCard({ playerId, cards }) {
            playSound('playCard');
            setPlayedCards(prev => [...prev, { playerId, cards }]);
            if (playerId === myId) {
                setMyCards(prev => prev.filter(card => !cards.some(c => c.value === card.value && c.suit === card.suit)));
            }
            if (cards.length > 0) setHasPassedThisRound(false);
        }

        function onPlayerFinished({ playerId }) {
            setFinishedPlayers(prev => [...prev, playerId]);
            playSound('win');
        }

        function onGameOver({ loserId, ranking }) {
            if (Array.isArray(ranking) && ranking.length > 0) {
                setFinishedPlayers(ranking); // <-- dùng thứ hạng từ server nếu có
            } else {
                setFinishedPlayers(prevFinished => {
                    // Nếu loserId chưa có trong danh sách, thêm vào cuối
                    if (!prevFinished.includes(loserId)) {
                        return [...prevFinished, loserId];
                    }
                    return prevFinished;
                });
            }

            setPlayers(prev => prev.map(p => ({ ...p, isReady: false })));
            setGameStarted(false);

            // Đảm bảo hiển thị ranking
            setShowRanking(true);
        }

        function onScoreUpdate({ scoreDelta, score }) {
            if (typeof score === 'number') setMyScore(score);
            else setMyScore(prev => prev + (scoreDelta || 0));
        }

        function onError({ message }) {
            alert('Lỗi: ' + message);
        }

        function onRoomsList(rooms) {
            setRooms(rooms);
        }

        function onRoomDeleted({ roomId: deletedRoomId }) {
            setRooms(prev => prev.filter(r => r.roomId !== deletedRoomId));
            if (roomId === deletedRoomId) {
                setRoomId(null);
                setPlayers([]);
                setGameStarted(false);
                setPlayedCards([]);
                setMyCards([]);
            }
            alert('Phòng đã bị xóa!');
        }

        function onLeftRoom({ roomId, playerId }) {
            if (playerId === myId) {
                setRoomId(null);
                setPlayers([]);
                setGameStarted(false);
                setPlayedCards([]);
                setMyCards([]);
                setCurrentTurn(null);
                alert('Bạn đã rời phòng!');
            }
        }

        function onNewRound({ currentTurn }) {
            setPlayedCards([]); // ✅ Clear bàn
            setCurrentTurn(currentTurn); // ✅ Cập nhật lượt mới
            if (currentTurn === myId) {
                setHasPassedThisRound(false); // ✅ Chỉ reset nếu là lượt mình
            } else {
                setHasPassedThisRound(true); // 🔒 Chặn người khác chơi
            }
        }


        socket.on('room_created', onRoomCreated);
        socket.on('joined_room', onJoinedRoom);
        socket.on('start_game', onStartGame);
        socket.on('your_turn', onYourTurn);
        socket.on('play_card', onPlayCard);
        socket.on('game_over', onGameOver);
        socket.on('player_finished', onPlayerFinished); // ✅ mới
        socket.on('score_update', onScoreUpdate);
        socket.on('error', onError);
        socket.on('new_round', onNewRound);
        socket.on('rooms_list', onRoomsList);
        socket.on('room_deleted', onRoomDeleted);
        socket.on('left_room', onLeftRoom);
        socket.on('pass_turn', onPassTurn);
        socket.on('update_players', ({ players }) => {
            setPlayers(players || []);
            // KHÔNG setShowRanking(false); // Giữ nguyên, không ẩn bảng xếp hạng ở đây
        });

        let interval = null;
        if (!roomId) {
            socket.emit('get_rooms');
            interval = setInterval(() => socket.emit('get_rooms'), 2000);
        }

        return () => {
            socket.off('room_created', onRoomCreated);
            socket.off('joined_room', onJoinedRoom);
            socket.off('start_game', onStartGame);
            socket.off('your_turn', onYourTurn);
            socket.off('play_card', onPlayCard);
            socket.off('game_over', onGameOver);
            socket.off('player_finished', onPlayerFinished);
            socket.off('score_update', onScoreUpdate);
            socket.off('error', onError);
            socket.off('new_round', onNewRound);
            socket.off('rooms_list', onRoomsList);
            socket.off('room_deleted', onRoomDeleted);
            socket.off('left_room', onLeftRoom);
            socket.off('pass_turn', onPassTurn);
            socket.off('update_players');
            if (interval) clearInterval(interval);
        };
    }, [roomId, myId, token]);

    // Khi vào phòng, lấy điểm từ players (nếu server trả về)
    useEffect(() => {
        const me = players.find(p => p.id === myId);
        if (me && typeof me.score === 'number') setMyScore(me.score);
    }, [players, myId]);

    // Tính vị trí avatar trên bàn cho hiệu ứng chia bài
    function getAvatarPositions() {
        const positions = [];
        if (!tableRef.current) return positions;
        orderedPlayers.forEach((p, idx) => {
            const ref = avatarRefs.current[p.id];
            if (ref && ref.current) {
                const rect = ref.current.getBoundingClientRect();
                const tableRect = tableRef.current.getBoundingClientRect();
                positions.push({
                    id: p.id,
                    left: rect.left + rect.width / 2 - tableRect.left,
                    top: rect.top + rect.height / 2 - tableRect.top,
                });
            }
        });
        return positions;
    }

    // Render hiệu ứng chia bài
    function renderDealingAnimation() {
        const numCards = 13;
        const positions = getAvatarPositions();
        const totalPlayers = orderedPlayers.length;
        const cards = [];
        // Lấy tâm table (khung bàn) làm điểm xuất phát, căn giữa lá bài
        let startLeft = 0, startTop = 0;
        if (tableRef.current) {
            const tableRect = tableRef.current.getBoundingClientRect();
            startLeft = tableRect.width / 2 - 16; // 16 = 32/2 (nửa width lá bài)
            startTop = tableRect.height / 2 - 22; // 22 = 44/2 (nửa height lá bài)
        } else {
            startLeft = 260 - 16;
            startTop = 100 - 22;
        }
        for (let i = 0; i < numCards * totalPlayers; i++) {
            const playerIdx = i % totalPlayers;
            const player = orderedPlayers[playerIdx];
            const pos = positions.find(p => p.id === player.id);
            if (!pos) continue;
            const delay = (i * 3000) / (numCards * totalPlayers);
            cards.push(
                <div
                    key={`dealcard-${i}`}
                    className="deal-anim-card"
                    style={{
                        left: startLeft,
                        top: startTop,
                        animation: `deal-move 0.5s ${delay}ms forwards cubic-bezier(.4,2,.6,1)`,
                        '--deal-x': `${pos.left - startLeft}px`,
                        '--deal-y': `${pos.top - startTop}px`
                    }}
                />
            );
        }
        return (
            <div className="deal-anim-layer">
                {cards}
            </div>
        );
    }

    // Hàm lấy vị trí DOM của lá bài của mình (ở thanh dưới)
    function getMyCardPosition(card) {
        // Lấy vị trí trung tâm avatar của mình (img)
        const myAvatarRef = avatarRefs.current[myId];
        if (!myAvatarRef?.current) return null;
        const img = myAvatarRef.current.querySelector('.person-img');
        if (!img || !tableContentRef.current) return null;
        const rect = img.getBoundingClientRect();
        const tableContentRect = tableContentRef.current.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2 - tableContentRect.left,
            y: rect.top + rect.height / 2 - tableContentRect.top
        };
    }

    // Hàm lấy vị trí DOM của mặt sau bài của đối thủ
    function getOpponentCardBackPosition(playerId) {
        const box = avatarRefs.current[playerId]?.current;
        if (!box) return null;
        const cardBack = box.parentNode?.querySelector('.card-back.card-back-count');
        if (!cardBack) return null;
        const rect = cardBack.getBoundingClientRect();
        if (!tableContentRef.current) return null;
        const tableContentRect = tableContentRef.current.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2 - tableContentRect.left,
            y: rect.top + rect.height / 2 - tableContentRect.top
        };
    }

    // Hàm lấy vị trí trung tâm .table-content (đích đến)
    function getTableContentCenter() {
        if (!tableContentRef.current) return { x: 0, y: 0 };
        const rect = tableContentRef.current.getBoundingClientRect();
        return {
            x: rect.width / 2 - 16,
            y: rect.height / 2 - 22
        };
    }

    // Khi bản thân bấm Đánh, lưu lại các lá bài sẽ đánh để hiệu ứng
    function handlePlayCard() {
        if (currentTurn !== myId || hasPassedThisRound || selectedCards.length === 0) return;
        const cardsToPlay = [...selectedCards];
        setPendingMyPlayCards(cardsToPlay); // Lưu lại để hiệu ứng flying card
        socket.emit('play_card', { cards: cardsToPlay });
        setSelectedCards([]);
        setHasPassedThisRound(false);
    }


    // Hiệu ứng đánh bài: khi có play_card mới
    useEffect(() => {
        if (playedCards.length === 0) return;

        const lastPlay = playedCards[playedCards.length - 1];
        if (!lastPlay || !lastPlay.cards || lastPlay.cards.length === 0) return;

        const { playerId, cards } = lastPlay;
        const isMe = playerId === myId;
        const dest = getTableContentCenter();

        // Nếu là bản thân, ưu tiên dùng pendingMyPlayCards để lấy vị trí DOM
        let cardsForEffect = cards;
        if (isMe && pendingMyPlayCards && pendingMyPlayCards.length === cards.length) {
            cardsForEffect = pendingMyPlayCards;
        }

        const newFlying = cardsForEffect.map((card, i) => {
            let from = null;
            if (isMe) {
                // Nếu là bản thân, lấy vị trí DOM của lá bài từ pendingMyPlayCards
                from = getMyCardPosition(card);
            } else {
                from = getOpponentCardBackPosition(playerId);
            }
            if (!from) return null;
            return {
                key: `${playerId}-${card.value}-${card.suit}-${Date.now()}-${i}`,
                card,
                from,
                to: dest,
                delay: i * 80,
            };
        }).filter(Boolean);

        if (newFlying.length > 0) {
            setFlyingCards(prev => [...prev, ...newFlying]);
            setShowPlayedCards(false);
            setTimeout(() => {
                setFlyingCards(prev => prev.slice(newFlying.length));
                setShowPlayedCards(true);
                // Sau khi hiệu ứng xong, reset pendingMyPlayCards nếu là bản thân
                if (isMe) setPendingMyPlayCards(null);
            }, 700 + newFlying.length * 80);
        } else {
            setShowPlayedCards(true);
            if (isMe) setPendingMyPlayCards(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playedCards]);

    // State để điều khiển việc hiển thị lá bài ở giữa bàn
    const [showPlayedCards, setShowPlayedCards] = useState(true);

    // Render hiệu ứng lá bài bay
    function renderFlyingCards() {
        // Các thông số cho hiệu ứng chồng và bung ra
        const cardWidth = 32;
        const overlap = 0.7; // 70% chồng lên
        const spread = 60;   // khoảng cách bung ra giữa các lá ở đích

        // Tính offset chồng cho từng lá ở vị trí xuất phát
        return flyingCards.map((item, idx, arr) => {
            const { from, to, card, key, delay } = item;
            const n = arr.length;
            // Tìm index của lá này trong flyingCards theo key
            const i = idx;
            // Offset chồng ở vị trí xuất phát
            const stackOffsetX = ((i - (n - 1) / 2) * cardWidth * (1 - overlap));
            const stackOffsetY = 0;
            // Offset bung ra ở vị trí đích
            const spreadOffsetX = ((i - (n - 1) / 2) * spread);
            const spreadOffsetY = 0 - 10;

            // Tính delta bay (từ vị trí chồng đến vị trí bung ra)
            const dx = (to.x - from.x) + (spreadOffsetX - stackOffsetX);
            const dy = (to.y - from.y) + (spreadOffsetY - stackOffsetY);

            return (
                <div
                    key={key}
                    className="flying-card-anim"
                    style={{
                        left: from.x + stackOffsetX - 11, // 16 = 32/2 (nửa width lá bài)
                        top: from.y + stackOffsetY,  // 22 = 44/2 (nửa height lá bài)
                        transform: 'translate(0px, 0px) scale(1)',
                        transition: `transform 0.5s cubic-bezier(.4,2,.6,1) ${delay}ms`,
                        zIndex: 99990000,
                        position: 'absolute',
                        pointerEvents: 'none'
                    }}
                    ref={el => {
                        if (el) {
                            setTimeout(() => {
                                el.style.transform = `translate(${dx}px, ${dy}px) scale(1)`;
                            }, 100);
                        }
                    }}
                >
                    <div className="card-item large">
                        {renderCard(card)}
                    </div>
                </div>
            );
        });
    }


    function handleCreateRoom() {
        setSelectedRoom(false);
        if (!playerName.trim()) return alert('Vui lòng nhập tên');
        socket.emit('create_room', { name: playerName });
    }

    function handleJoinRoom(roomId) {
        setSelectedRoom(false);
        if (!playerName.trim()) return alert('Vui lòng nhập tên');
        socket.emit('join_room', { roomId, name: playerName });
    }


    function handlePassTurn() {
        if (currentTurn !== myId) return;
        socket.emit('pass_turn');
        setSelectedCards([]);
        setHasPassedThisRound(true);
    }

    function handleCardClick(card) {
        if (currentTurn !== myId || hasPassedThisRound) return;
        playSound('selectCard');
        setSelectedCards(prev => {
            const exists = prev.find(c => c.value === card.value && c.suit === card.suit);
            return exists ? prev.filter(c => !(c.value === card.value && c.suit === card.suit)) : [...prev, card];
        });
    }

    function renderCard(card) {
        let valueStr = card.value;
        if (valueStr === 11) valueStr = 'J';
        else if (valueStr === 12) valueStr = 'Q';
        else if (valueStr === 13) valueStr = 'K';
        else if (valueStr === 14) valueStr = 'A';
        else if (valueStr === 15) valueStr = '2';
        const cardText = `${valueStr}${card.suit}`;
        const isRed = card.suit === '♥' || card.suit === '♦';
        return <span className={isRed ? 'card-red' : ''}>{cardText}</span>;
    }

    function handleLeaveRoom() {
        setSelectedRoom(true);
        socket.emit('leave_room');
    }

    function handleReady() {
        setShowRanking(false); // <-- Ẩn bảng xếp hạng khi nhấn Sẵn sàng
        setFinishedPlayers([]);
        setPlayedCards([]);
        setMyCards([]);
        setCurrentTurn(null);
        setSelectedCards([]);
        setHasPassedThisRound(false);
        socket.emit('ready');
    }


    let myIdx = players.findIndex(pl => pl.id === myId);
    let orderedPlayers = [];
    if (players.length > 0 && myIdx !== -1) {
        for (let i = 0; i < players.length; i++) {
            orderedPlayers.push(players[(myIdx + i) % players.length]);
        }
    } else {
        orderedPlayers = players;
    }

    const posMap = ['table-player-bottom', 'table-player-right', 'table-player-top', 'table-player-left'];
    const allReady = players.length > 1 && players.every(p => p.isReady);
    // Tạo playerRanks từ finishedPlayers (thứ tự ranking từ server)
    const playerRanks = {};
    let rankingList = [...finishedPlayers];
    // Không tự động bổ sung người còn lại vào rankingList nữa!
    // rankingList phải luôn là thứ tự đúng từ server
    rankingList.forEach((id, index) => {
        playerRanks[id] = index + 1;
    });

    // Chuẩn bị ref cho từng avatar
    orderedPlayers.forEach(p => {
        if (!avatarRefs.current[p.id]) {
            avatarRefs.current[p.id] = React.createRef();
        }
    });

    // Xác định có phải lượt đầu tiên của ván không
    const isFirstTurn = playedCards.length === 0 && currentTurn === firstTurnPlayerId;

    console.log(allReady);



    return (
        <div className="app-container">
            {showRanking && rankingList.length > 0 && (
                <div className="ranking-box">
                    <h3>Xếp hạng</h3>
                    <ul>
                        {rankingList.map((id, index) => {
                            const player = players.find(p => p.id === id);
                            return (
                                <li key={id}>
                                    {index + 1}. {player?.name || id.slice(0, 6)}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            <div className='table' ref={tableRef}>
                <div className='table-frame'></div>
                <div className='table-content' ref={tableContentRef}>
                    {/* Hiệu ứng đánh bài */}
                    {renderFlyingCards()}
                    {playedCards.length > 0 && showPlayedCards && (
                        <div className="played-cards-center">
                            {/* Sắp xếp các lá bài được đánh ra theo giá trị tăng dần, chất ♠ < ♣ < ♦ < ♥ */}
                            {(() => {
                                const suitOrder = { '♠': 1, '♣': 2, '♦': 3, '♥': 4 };
                                const lastCards = playedCards[playedCards.length - 1].cards.slice().sort(
                                    (a, b) => a.value - b.value || suitOrder[a.suit] - suitOrder[b.suit]
                                );
                                return lastCards.map((card, i) => (
                                    <div key={i} className="card-item large">
                                        {renderCard(card)}
                                    </div>
                                ));
                            })()}
                        </div>
                    )}
                    {dealing && renderDealingAnimation()}
                </div>

                <div className="table-center-box">
                    {!gameStarted && (
                        <div className="deck-box">
                            <div className="deck-card stack-1"></div>
                            <div className="deck-card stack-2"></div>
                            <div className="deck-card stack-3"></div>
                            <div className="deck-card stack-4"></div>
                            <div className="deck-card stack-5"></div>
                        </div>
                    )}
                    {!gameStarted && roomId && !players.find(p => p.id === myId)?.isReady && (
                        <button className="ready-btn center-ready-btn" onClick={handleReady}>Sẵn sàng</button>
                    )}

                </div>

                <div className="table-players">
                    {orderedPlayers.length === 0 && myId ? (
                        <div className={`box-person me table-player-bottom`}>
                            <div className="person-row">
                                <div className="person-info" ref={avatarRefs.current[myId]}>
                                    <img
                                        src={(players.find(p => p.id === myId)?.image) || '/icon-64.png'}
                                        alt="avatar"
                                        className="person-img"
                                    />
                                    <span className="person-name">
                                        {playerName}
                                        {/* Hiển thị điểm của mình */}
                                        <span style={{ marginLeft: 8, color: '#ffd700', fontWeight: 'bold' }}>
                                            {myScore > 0 ? `${myScore}🟡` : myScore + '🟡'}
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        orderedPlayers.map((p, idx) => {
                            const isMe = idx === 0;
                            const posClass = posMap[idx] || '';
                            const imgSrc = p.image || '/icon-64.png';
                            const cardCount = isMe ? myCards.length : (typeof p.cardCount === 'number' ? p.cardCount : (p.cards ? p.cards.length : 13));

                            if (isMe) {
                                return (
                                    <React.Fragment key={p.id}>
                                        <div className={`box-person me ${posClass}`}>
                                            {gameStarted && !dealing && (
                                                <div className="my-action-row">
                                                    {currentTurn === myId && !hasPassedThisRound && !finishedPlayers.includes(myId) && (
                                                        <div className="my-action-buttons">
                                                            <button onClick={handlePlayCard} className="play-card-btn">Đánh</button>
                                                            <button
                                                                onClick={handlePassTurn}
                                                                className="pass-card-btn"
                                                                disabled={isFirstTurn} // Disable nếu là lượt đầu tiên
                                                            >
                                                                Bỏ qua
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <div className="person-row">
                                                <div className="person-info" ref={avatarRefs.current[p.id]}>
                                                    <img
                                                        src={imgSrc}
                                                        alt="avatar"
                                                        className={`person-img ${currentTurn === p.id
                                                            ? 'border-yellow'
                                                            : p.isReady
                                                                ? 'border-green'
                                                                : 'border-black'
                                                            }`}
                                                    />
                                                    <span className="person-name">
                                                        {p.name || p.id.slice(0, 6)}
                                                        {/* Hiển thị điểm số của bản thân */}
                                                        <span style={{ marginLeft: 8, color: '#ffd700', fontWeight: 'bold' }}>
                                                            {myScore > 0 ? `${myScore}🟡` : myScore + '🟡'}
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="my-cards-bar">
                                            {gameStarted && !dealing && myCards.map(card => (
                                                <div
                                                    key={`${card.value}-${card.suit}`}
                                                    className={`card-item${selectedCards.some(c => c.value === card.value && c.suit === card.suit) ? ' selected' : ''}`}
                                                    onClick={() => handleCardClick(card)}
                                                    style={{ cursor: currentTurn === myId && !hasPassedThisRound ? 'pointer' : 'not-allowed' }}
                                                >
                                                    {renderCard(card)}
                                                </div>
                                            ))}
                                            {playerRanks.hasOwnProperty(myId) && !dealing && (
                                                <div className="my-rank-indicator">
                                                    {playerRanks[myId]}
                                                </div>
                                            )}
                                        </div>


                                    </React.Fragment>
                                );
                            } else {
                                return (
                                    <div key={p.id} className={`box-person ${posClass}`}>
                                        <div className="person-info" ref={avatarRefs.current[p.id]}>
                                            <img
                                                src={p.image || imgSrc}
                                                alt="avatar"
                                                className={`person-img ${currentTurn === p.id
                                                    ? 'border-yellow'
                                                    : p.isReady
                                                        ? 'border-green'
                                                        : 'border-black'
                                                    }`}
                                            />
                                            <span className="person-name">
                                                {p.name || p.id.slice(0, 6)}
                                                {/* (Tùy chọn) Hiển thị điểm nếu server trả về */}
                                                {typeof p.score === 'number' &&
                                                    <span style={{ marginLeft: 8, color: '#ffd700', fontWeight: 'bold' }}>
                                                        {p.score > 0 ? `${p.score}🟡` : p.score + '🟡'}
                                                    </span>
                                                }
                                            </span>
                                        </div>
                                        <div className="person-cards">
                                            {playerRanks.hasOwnProperty(p.id) && !dealing ? (
                                                <div className="player-rank-badge">{playerRanks[p.id]}</div>
                                            ) : gameStarted && !dealing && (
                                                <div className="card-back card-back-count">
                                                    <span className="card-back-count-num">{cardCount}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            }
                        })
                    )}
                </div>
            </div>

            {selectedRoom && (
                <div className='setup-game'>
                    <div className="input-row">
                        <input
                            type="text"
                            placeholder="Nhập tên của bạn"
                            value={playerName}
                            onChange={e => setPlayerName(e.target.value)}
                            disabled
                            className="input-name"
                        />
                        <button onClick={handleCreateRoom} disabled={!!roomId} className="create-room-btn">Tạo Phòng</button>
                        <button className='btn-personal' onClick={() => navigate('/personal')}>Trang cá nhân</button>
                        <button className='btn-reload' onClick={() => window.location.reload()>reload</button>
                    </div>

                    {!roomId && (
                        <div className="room-list">
                            <strong>Phòng đang mở ({rooms.length}):</strong>
                            <ul className='room-scroll-list'>
                                {rooms.map(room => (
                                    <li key={room.roomId} className="room-list-item">
                                        <span className="room-list-title">Phòng: {room.roomId.slice(0, 6)}</span> - Số người: {room.playerCount}
                                        <span className="room-status" style={{ color: room.started ? 'green' : '#8d5c00' }}>
                                            {room.started ? 'Đang chơi' : 'Chưa bắt đầu'}
                                        </span>
                                        <button className="join-room-btn" onClick={() => handleJoinRoom(room.roomId)} disabled={!!roomId || !playerName.trim() || room.started}>Tham Gia</button>
                                        <span className="room-players">
                                            {room.players.map(p => (p.name || p.id.slice(0, 6)) + (p.isReady ? ' (sẵn sàng)' : '')).join(', ')}
                                        </span>
                                        <hr />
                                    </li>
                                ))}
                                {rooms.length === 0 && <li key="no-room">Không có phòng nào.</li>}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            <div className="room-id-row">
                {roomId && !showRanking && <p><strong>Mã phòng: </strong> {roomId ? roomId.slice(0, 6) : 'Chưa có'}</p>}
                {roomId && <button onClick={handleLeaveRoom} className="leave-room-btn">Rời phòng</button>}
            </div>
        </div>
    );
}


export default App;

