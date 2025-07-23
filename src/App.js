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
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const myId = user._id || user.id || '';
    const token = user.token || '';
    const [roomId, setRoomId] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [playerName, setPlayerName] = useState('new ' + Math.floor(Math.random() * 1000));
    const [selectedCards, setSelectedCards] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState(true);
    const [hasPassedThisRound, setHasPassedThisRound] = useState(false);
    const [finishedPlayers, setFinishedPlayers] = useState([]);
    const [showRanking, setShowRanking] = useState(false);
    const [myScore, setMyScore] = useState(0);
    const [dealing, setDealing] = useState(false);
    const [firstTurnPlayerId, setFirstTurnPlayerId] = useState(null);
    const navigate = useNavigate();
    const tableRef = useRef(null);
    const tableContentRef = useRef(null);
    const avatarRefs = useRef({});

    const [flyingCards, setFlyingCards] = useState([]);
    const [pendingMyPlayCards, setPendingMyPlayCards] = useState(null);

    //Thêm đoạn này
    const [peerConnections, setPeerConnections] = useState({});
    const localStreamRef = useRef(null);
    const [micEnabled, setMicEnabled] = useState(true);
    const pendingCandidatesRef = useRef({});


    window.alertify.set('notifier', 'position', 'top-left');
    window.alertify.set('notifier', 'delay', 3);

    useEffect(() => {
        if (token) {
            socket.emit('init_player', { token });
        }
    }, [token]);

    useEffect(() => {
        return () => {
            cleanupVoiceChat();
        };
    }, []);

    useEffect(() => {
        async function fetchUser() {
            const res = await getUser(myId, token);
            if (res && res._id) setPlayerName(res.name);
        }
        fetchUser();
    }, [myId, token]);

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
        }

        // Thêm đoạn này
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            localStreamRef.current = stream;
        });

        function onStartGame(data) {
            setGameStarted(true);
            setPlayers(data.players || []);
            setPlayedCards([]);
            setCurrentTurn(data.currentTurn);
            setHasPassedThisRound(false);
            setFinishedPlayers([]);
            setShowRanking(false);
            setDealing(true);
            playSound('deal');

            setFirstTurnPlayerId(data.currentTurn);
            setTimeout(() => {
                setMyCards(data.hand || []);
                stopSound('deal');
                setDealing(false);
            }, 3000);
        }

        function onYourTurn({ playerId }) {
            setCurrentTurn(playerId);
            if (playerId === myId) setHasPassedThisRound(false);
        }

        function onPassTurn({ playerId }) {
            playSound('passTurn');
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
                setFinishedPlayers(ranking);
            } else {
                setFinishedPlayers(prevFinished => {
                    if (!prevFinished.includes(loserId)) {
                        return [...prevFinished, loserId];
                    }
                    return prevFinished;
                });
            }

            setPlayers(prev => prev.map(p => ({ ...p, isReady: false })));
            setGameStarted(false);

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
                window.alertify.success('Phòng đã bị xóa!');
            }
        }

        function onLeftRoom({ roomId, playerId }) {
            if (playerId === myId) {
                setRoomId(null);
                setPlayers([]);
                setGameStarted(false);
                setPlayedCards([]);
                setMyCards([]);
                setCurrentTurn(null);
                socket.emit('get_rooms');
                window.alertify.success('Một người đã rời phòng!');
            }
        }

        function onNewRound({ currentTurn }) {
            setPlayedCards([]);
            setCurrentTurn(currentTurn);
            if (currentTurn === myId) {
                setHasPassedThisRound(false);
            } else {
                setHasPassedThisRound(true);
            }
        }


        socket.on('room_created', onRoomCreated);
        socket.on('joined_room', onJoinedRoom);
        socket.on('start_game', onStartGame);
        socket.on('your_turn', onYourTurn);
        socket.on('play_card', onPlayCard);
        socket.on('game_over', onGameOver);
        socket.on('player_finished', onPlayerFinished);
        socket.on('score_update', onScoreUpdate);
        socket.on('error', onError);
        socket.on('new_round', onNewRound);
        socket.on('rooms_list', onRoomsList);
        socket.on('room_deleted', onRoomDeleted);
        socket.on('left_room', onLeftRoom);
        socket.on('new_peer', async ({ peerId }) => {
            if (!localStreamRef.current) return;
            if (peerConnections[peerId]) return;

            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));

            pc.onicecandidate = event => {
                if (event.candidate) {
                    socket.emit('signal', { targetId: peerId, data: { candidate: event.candidate } });
                }
            };

            pc.ontrack = event => {
                const remoteAudio = new Audio();
                remoteAudio.srcObject = event.streams[0];
                remoteAudio.autoplay = true;
                remoteAudio.play();
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('signal', { targetId: peerId, data: { sdp: pc.localDescription } });

            setPeerConnections(prev => ({ ...prev, [peerId]: pc }));
        });

        socket.on("signal", async ({ sourceId, data }) => {
            let pc = peerConnections[sourceId];

            if (pc && pc.signalingState === "closed") return;

            if (!pc) {
                pc = new RTCPeerConnection({
                    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
                });

                if (localStreamRef.current) {
                    localStreamRef.current.getTracks().forEach((track) =>
                        pc.addTrack(track, localStreamRef.current)
                    );
                }

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        socket.emit("signal", {
                            targetId: sourceId,
                            data: { candidate: event.candidate },
                        });
                    }
                };

                pc.ontrack = (event) => {
                    const remoteAudio = new Audio();
                    remoteAudio.srcObject = event.streams[0];
                    remoteAudio.autoplay = true;
                    remoteAudio.play();
                };

                setPeerConnections((prev) => ({ ...prev, [sourceId]: pc }));
            }

            try {
                if (data.sdp) {
                    const desc = new RTCSessionDescription(data.sdp);

                    if (desc.type === "offer") {
                        await pc.setRemoteDescription(desc);

                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);

                        socket.emit("signal", {
                            targetId: sourceId,
                            data: { sdp: pc.localDescription },
                        });

                        // Sau khi đã setRemoteDescription xong → xử lý các ICE pending
                        if (pendingCandidatesRef.current[sourceId]) {
                            for (const cand of pendingCandidatesRef.current[sourceId]) {
                                await pc.addIceCandidate(cand);
                            }
                            delete pendingCandidatesRef.current[sourceId];
                        }

                    } else if (desc.type === "answer") {
                        if (pc.signalingState === "have-local-offer") {
                            await pc.setRemoteDescription(desc);

                            if (pendingCandidatesRef.current[sourceId]) {
                                for (const cand of pendingCandidatesRef.current[sourceId]) {
                                    await pc.addIceCandidate(cand);
                                }
                                delete pendingCandidatesRef.current[sourceId];
                            }
                        } else {
                            console.warn("⚠️ Skipping unexpected answer, state:", pc.signalingState);
                        }
                    }
                }

                if (data.candidate) {
                    if (pc.remoteDescription && pc.remoteDescription.type) {
                        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                    } else {
                        // Đệm lại nếu chưa có remoteDescription
                        if (!pendingCandidatesRef.current[sourceId]) {
                            pendingCandidatesRef.current[sourceId] = [];
                        }
                        pendingCandidatesRef.current[sourceId].push(new RTCIceCandidate(data.candidate));
                    }
                }
            } catch (err) {
                console.error("❌ Error handling signal", err);
            }
        });



        socket.on('pass_turn', onPassTurn);
        socket.on('update_players', ({ players }) => {
            setPlayers(players || []);
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

    useEffect(() => {
        const me = players.find(p => p.id === myId);
        if (me && typeof me.score === 'number') setMyScore(me.score);
    }, [players, myId]);

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

    function renderDealingAnimation() {
        const numCards = 13;
        const positions = getAvatarPositions();
        const totalPlayers = orderedPlayers.length;
        const cards = [];
        let startLeft = 0, startTop = 0;
        if (tableRef.current) {
            const tableRect = tableRef.current.getBoundingClientRect();
            startLeft = tableRect.width / 2 - 16;
            startTop = tableRect.height / 2 - 22;
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

    // Wrap getMyCardPosition in useCallback to avoid useEffect warning
    const getMyCardPosition = React.useCallback((card) => {
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
    }, [avatarRefs, myId, tableContentRef]);

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

    function getTableContentCenter() {
        if (!tableContentRef.current) return { x: 0, y: 0 };
        const rect = tableContentRef.current.getBoundingClientRect();
        return {
            x: rect.width / 2 - 16,
            y: rect.height / 2 - 22
        };
    }

    function handlePlayCard() {
        if (currentTurn !== myId || hasPassedThisRound || selectedCards.length === 0) return;
        const cardsToPlay = [...selectedCards];
        setPendingMyPlayCards(cardsToPlay);
        socket.emit('play_card', { cards: cardsToPlay });
        setSelectedCards([]);
        setHasPassedThisRound(false);
    }


    useEffect(() => {
        if (playedCards.length === 0) return;

        const lastPlay = playedCards[playedCards.length - 1];
        if (!lastPlay || !lastPlay.cards || lastPlay.cards.length === 0) return;

        const { playerId, cards } = lastPlay;
        const isMe = playerId === myId;
        const dest = getTableContentCenter();

        let cardsForEffect = cards;
        if (isMe && pendingMyPlayCards && pendingMyPlayCards.length === cards.length) {
            cardsForEffect = pendingMyPlayCards;
        }

        const newFlying = cardsForEffect.map((card, i) => {
            let from = null;
            if (isMe) {
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
                if (isMe) setPendingMyPlayCards(null);
            }, 700 + newFlying.length * 80);
        } else {
            setShowPlayedCards(true);
            if (isMe) setPendingMyPlayCards(null);
        }
    }, [playedCards, getMyCardPosition, myId, pendingMyPlayCards]);

    const [showPlayedCards, setShowPlayedCards] = useState(true);

    function renderFlyingCards() {
        const cardWidth = 32;
        const overlap = 0.7;
        const spread = 55;

        return flyingCards.map((item, idx, arr) => {
            const { from, to, card, key, delay } = item;
            const n = arr.length;
            const i = idx;
            const stackOffsetX = ((i - (n - 1) / 2) * cardWidth * (1 - overlap));
            const stackOffsetY = 0;
            const spreadOffsetX = ((i - (n - 1) / 2) * spread);
            const spreadOffsetY = 0 - 10;

            const dx = (to.x - from.x) + (spreadOffsetX - stackOffsetX);
            const dy = (to.y - from.y) + (spreadOffsetY - stackOffsetY);

            return (
                <div
                    key={key}
                    className="flying-card-anim"
                    style={{
                        left: from.x + stackOffsetX - 11,
                        top: from.y + stackOffsetY,
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
        cleanupVoiceChat();
        setSelectedRoom(true);
        socket.emit('leave_room');
        socket.emit('get_rooms');
    }

    function handleReady() {
        setShowRanking(false);
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
    const playerRanks = {};
    let rankingList = [...finishedPlayers];
    rankingList.forEach((id, index) => {
        playerRanks[id] = index + 1;
    });

    orderedPlayers.forEach(p => {
        if (!avatarRefs.current[p.id]) {
            avatarRefs.current[p.id] = React.createRef();
        }
    });

    const isFirstTurn = playedCards.length === 0 && currentTurn === firstTurnPlayerId;
    console.log(allReady);

    //thêm đoạn này
    const cleanupVoiceChat = () => {
        Object.values(peerConnections).forEach((pc) => {
            try {
                if (pc.signalingState !== "closed") {
                    pc.close();
                }
            } catch (e) {
                console.warn("Error closing pc", e);
            }
        });

        setPeerConnections({});
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
        }
        pendingCandidatesRef.current = {};
    };



    function toggleMic() {
        if (localStreamRef.current) {
            const tracks = localStreamRef.current.getAudioTracks();
            const enabled = tracks[0]?.enabled;
            const newEnabled = !enabled;

            tracks.forEach(track => {
                track.enabled = newEnabled;
            });

            setMicEnabled(newEnabled);
        }
    }


    return (
        <div className="app-container">
            <div className='table' ref={tableRef}>
                <div className='table-frame'></div>
                <div className='table-content' ref={tableContentRef}>
                    {renderFlyingCards()}
                    {playedCards.length > 0 && showPlayedCards && (
                        <div className="played-cards-center">
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
                        <button className='btn-reload' onClick={() => window.location.reload()}>reload</button>
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
                {/* {roomId && !showRanking && <p><strong>Mã phòng: </strong> {roomId ? roomId.slice(0, 6) : 'Chưa có'}</p>} */}
                {roomId && <button onClick={handleLeaveRoom} className="leave-room-btn">Rời phòng</button>}
                {roomId && (
                    <button onClick={toggleMic}>
                        {micEnabled ? 'Tắt Mic' : 'Bật Mic'}
                    </button>
                )}
            </div>
        </div>
    );
}


export default App;

