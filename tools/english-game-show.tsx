import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
    Play, Pause, RotateCcw, SkipForward, Check, X, 
    Settings, Undo, ChevronRight, Trophy, AlertCircle, Sparkles, Image as ImageIcon,
    Bot, Loader2
} from 'lucide-react';

const MIN_SCORE_DEFAULT = 0;
const COOLDOWN_TIME = 3000;
const SCORE_CORRECT = 5;
const SCORE_WRONG = -2;

// --- DATA: DEFAULT FALLBACKS ---
const DEFAULT_R1_SENTENCES = [
    { 
        red: ["The", "cat", "is", "black"], 
        blue: ["The", "dog", "is", "brown"] 
    },
    { 
        red: ["I", "like", "sweet", "apples"], 
        blue: ["I", "love", "cold", "juice"] 
    },
    { 
        red: ["She", "is", "reading", "a", "book"], 
        blue: ["He", "is", "kicking", "a", "ball"] 
    },
    { 
        red: ["The", "dog", "is", "under", "the", "chair"], 
        blue: ["The", "bird", "is", "on", "the", "table"] 
    },
    { 
        red: ["My", "mother", "is", "very", "kind"], 
        blue: ["My", "father", "is", "very", "tall"] 
    }
];

const DEFAULT_R2_QUESTIONS = [
    {
        red: { text: "The dog ___ running in the park.", options: ["is", "are", "am"], answer: "is" },
        blue: { text: "The cats ___ sleeping on the mat.", options: ["is", "are", "am"], answer: "are" }
    },
    {
        red: { text: "I have ___ apples in my bag.", options: ["two", "too", "to"], answer: "two" },
        blue: { text: "She wants ___ buy a new book.", options: ["two", "too", "to"], answer: "to" }
    },
    {
        red: { text: "___ is your favorite color?", options: ["What", "Who", "Where"], answer: "What" },
        blue: { text: "___ is the teacher going?", options: ["What", "Who", "Where"], answer: "Where" }
    },
    {
        red: { text: "The book is ___ the table.", options: ["on", "in", "under"], answer: "on" },
        blue: { text: "The fish is ___ the water.", options: ["on", "in", "under"], answer: "in" }
    },
    {
        red: { text: "He ___ playing football.", options: ["like", "likes", "liking"], answer: "likes" },
        blue: { text: "They ___ eating pizza.", options: ["like", "likes", "liking"], answer: "like" }
    }
];

const DEFAULT_R3_VOCAB = {
    NOUN: ['cat', 'dog', 'book', 'apple', 'school', 'ball', 'pencil', 'car', 'tree', 'sun'],
    VERB: ['run', 'jump', 'eat', 'read', 'write', 'play', 'swim', 'sleep', 'walk', 'sing'],
    ADJECTIVE: ['big', 'small', 'red', 'blue', 'happy', 'sad', 'hot', 'cold', 'tall', 'fast'],
    PREPOSITION: ['in', 'on', 'under', 'beside', 'behind', 'near', 'above', 'below', 'by', 'with'],
    PRONOUN: ['I', 'you', 'he', 'she', 'we', 'they', 'it', 'me', 'him', 'her']
};

const BALLOON_COLORS = [
    { name: 'red', hex: '#ef4444', dark: '#991b1b' },
    { name: 'blue', hex: '#3b82f6', dark: '#1e3a8a' },
    { name: 'green', hex: '#22c55e', dark: '#14532d' },
    { name: 'yellow', hex: '#eab308', dark: '#a16207' },
    { name: 'purple', hex: '#a855f7', dark: '#6b21a8' },
    { name: 'pink', hex: '#ec4899', dark: '#be185d' },
    { name: 'orange', hex: '#f97316', dark: '#c2410c' }
];

const injectGlobalStyles = () => {
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes rise { 0% { bottom: -100px; transform: translateX(0) rotate(0deg); } 100% { bottom: 120%; transform: translateX(20px) rotate(10deg); } }
        @keyframes pop { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.5; } 100% { transform: scale(0); opacity: 0; } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } }
        @keyframes scorePop { 0% { transform: scale(0.5) translateY(20px); opacity: 0; } 50% { transform: scale(1.2) translateY(-10px); opacity: 1; } 100% { transform: scale(1) translateY(0); opacity: 0; } }
        
        /* New Game Completion Animations */
        @keyframes confetti-fall { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } }
        @keyframes trophy-bounce { 0%, 100% { transform: scale(1) translateY(0); } 50% { transform: scale(1.1) translateY(-10px); } }
        @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 20px currentColor; } 50% { box-shadow: 0 0 60px currentColor; } }
        
        @keyframes localScoreFloat { 0% { transform: translateY(0) scale(0.5); opacity: 0; } 20% { transform: translateY(-20px) scale(1.2); opacity: 1; } 100% { transform: translateY(-100px) scale(1); opacity: 0; } }
        .anim-local-score { animation: localScoreFloat 1s ease-out forwards; }
        
        .anim-shake { animation: shake 0.4s ease-in-out; }
        .pulse-glow { animation: pulse-glow 2s infinite ease-in-out; }
        
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    `;
    document.head.appendChild(style);
};

const AIGeneratorModal = ({ onClose, onDataGenerated }) => {
    const [topic, setTopic] = useState('');
    const [difficulty, setDifficulty] = useState('Basic');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!topic.trim()) {
            setError('Please enter a topic!');
            return;
        }
        setIsGenerating(true);
        setError('');
        
        try {
            const apiKey = (localStorage.getItem('cth_gemini_key')||""); 
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

            const payload = {
                contents: [{
                    role: "user",
                    parts: [{ 
                        text: `Act as a Malaysian primary school ESL teacher. Generate English game show questions for 8-year-old Year 2 pupils based on the topic: "${topic}". Difficulty level: ${difficulty}.
                        
                        You MUST return a JSON matching this exact structure requirements:
                        - round1: Array of 5 objects. Each object has "red" and "blue" arrays containing words of a sentence. (e.g. ["The", "cat", "is", "fat"]). Do NOT attach punctuation to words. Keep sentences 4-7 words long.
                        - round2: Array of 5 objects. Each has "red" and "blue" objects. Each object has "text" (a sentence with exact "___" 3 underscores for the blank), "options" (array of 3 strings), and "answer" (string matching correct option).
                        - round3: Object with keys "NOUN", "VERB", "ADJECTIVE", "PREPOSITION", "PRONOUN". Each key contains an array of 10 English words fitting that grammatical category. Fit the topic if possible, otherwise use standard words.`
                    }]
                }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            round1: {
                                type: "ARRAY",
                                items: {
                                    type: "OBJECT",
                                    properties: {
                                        red: { type: "ARRAY", items: { type: "STRING" } },
                                        blue: { type: "ARRAY", items: { type: "STRING" } }
                                    }
                                }
                            },
                            round2: {
                                type: "ARRAY",
                                items: {
                                    type: "OBJECT",
                                    properties: {
                                        red: {
                                            type: "OBJECT",
                                            properties: {
                                                text: { type: "STRING" },
                                                options: { type: "ARRAY", items: { type: "STRING" } },
                                                answer: { type: "STRING" }
                                            }
                                        },
                                        blue: {
                                            type: "OBJECT",
                                            properties: {
                                                text: { type: "STRING" },
                                                options: { type: "ARRAY", items: { type: "STRING" } },
                                                answer: { type: "STRING" }
                                            }
                                        }
                                    }
                                }
                            },
                            round3: {
                                type: "OBJECT",
                                properties: {
                                    NOUN: { type: "ARRAY", items: { type: "STRING" } },
                                    VERB: { type: "ARRAY", items: { type: "STRING" } },
                                    ADJECTIVE: { type: "ARRAY", items: { type: "STRING" } },
                                    PREPOSITION: { type: "ARRAY", items: { type: "STRING" } },
                                    PRONOUN: { type: "ARRAY", items: { type: "STRING" } }
                                }
                            }
                        }
                    }
                }
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            
            if (result.candidates && result.candidates.length > 0) {
                const jsonText = result.candidates[0].content.parts[0].text;
                const parsedData = JSON.parse(jsonText);
                onDataGenerated(parsedData);
            } else {
                throw new Error("Failed to generate content. Please check API Key.");
            }
        } catch (e) {
            console.error(e);
            setError('Error generating questions. Please try again.');
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white flex justify-between items-center">
                    <h2 className="text-2xl font-black flex items-center gap-3">
                        <Bot className="w-8 h-8" /> 
                        AI Question Generator
                    </h2>
                    <button onClick={onClose} disabled={isGenerating} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-8 space-y-6 text-slate-800">
                    {error && (
                        <div className="bg-red-100 text-red-700 p-4 rounded-xl flex items-center gap-3 font-bold border border-red-200">
                            <AlertCircle /> {error}
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <label className="font-bold text-lg">Topic / Theme</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Animals, Space, Malaysian Food, Action Verbs..." 
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            disabled={isGenerating}
                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-lg font-medium"
                        />
                        <p className="text-sm text-slate-500">The AI will generate questions for all 3 rounds based on this topic for Year 2 ESL pupils.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="font-bold text-lg">Difficulty Level</label>
                        <div className="flex gap-4">
                            {['Basic', 'Medium', 'Challenge'].map(level => (
                                <button
                                    key={level}
                                    onClick={() => setDifficulty(level)}
                                    disabled={isGenerating}
                                    className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${difficulty === level ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-black text-xl py-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-4"
                    >
                        {isGenerating ? (
                            <><Loader2 className="w-6 h-6 animate-spin" /> Generating Magic...</>
                        ) : (
                            <><Sparkles className="w-6 h-6" /> Generate Full Game Set</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const CooldownOverlay = ({ team, count }) => {
    if (count === 0) return null;
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto bg-black/10 backdrop-blur-[2px]">
            <div className="bg-white/95 border-4 border-slate-800 shadow-2xl text-slate-900 text-5xl px-8 py-4 rounded-3xl font-black animate-pulse flex items-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin" /> Wait {count}s
            </div>
        </div>
    );
};

const FeedbackDisplay = ({ feedback }) => {
    if (!feedback) return null;
    const isCorrect = feedback.type === 'correct';
    return (
        <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center">
            <div className={`
                flex flex-col items-center justify-center p-8 rounded-3xl shadow-2xl transform transition-transform
                ${isCorrect ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}
            `}
            style={{ animation: 'scorePop 1.5s ease-out forwards' }}>
                <div className="text-6xl font-black mb-2">
                    {isCorrect ? 'CORRECT!' : 'NOT QUITE!'}
                </div>
                <div className="text-5xl font-bold">
                    {feedback.marks > 0 ? `+${feedback.marks}` : feedback.marks}
                </div>
                {isCorrect && <Sparkles className="w-16 h-16 absolute -top-8 -right-8 text-yellow-300 animate-spin" style={{animationDuration: '3s'}} />}
            </div>
        </div>
    );
};

const TeamPanelHeader = ({ team, score, roundScore, qNum }) => {
    const isRed = team === 'red';
    return (
        <div className={`flex items-center justify-between p-4 rounded-t-2xl border-b-4 ${isRed ? 'bg-red-600 border-red-800' : 'bg-blue-600 border-blue-800'} text-white`}>
            <div className="flex items-center gap-4">
                <h2 className="text-3xl font-black tracking-widest">{isRed ? 'TEAM RED' : 'TEAM BLUE'}</h2>
                {qNum && <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold shadow-inner">Q {qNum}</span>}
            </div>
            <div className="text-right">
                <div className="text-sm font-semibold opacity-80">ROUND SCORE</div>
                <div className="text-4xl font-black leading-none">{roundScore}</div>
            </div>
        </div>
    );
};

const Round1 = ({ globalScores, roundScores, cooldowns, triggerCooldown, quickFeedback, feedback, playSound, data }) => {
    const [qIndex, setQIndex] = useState({ red: 0, blue: 0 });
    const [stateRed, setStateRed] = useState({ selected: [], error: false });
    const [stateBlue, setStateBlue] = useState({ selected: [], error: false });

    const generateFloatingWords = (targetSentence) => {
        let shuffled = [...targetSentence].sort(() => Math.random() - 0.5);
        return shuffled.map((word, i) => ({
            id: `${word}-${i}`,
            word,
            x: 5 + Math.random() * 70, 
            y: 5 + Math.random() * 70,
            vx: (Math.random() > 0.5 ? 1 : -1) * (20 + Math.random() * 20), // Speed: 20-40% per sec
            vy: (Math.random() > 0.5 ? 1 : -1) * (20 + Math.random() * 20)
        }));
    };

    const [wordsRed, setWordsRed] = useState([]);
    const [wordsBlue, setWordsBlue] = useState([]);

    useEffect(() => {
        if (data && data.length > 0) {
            const currentData = data[qIndex.red % data.length];
            setWordsRed(generateFloatingWords(currentData.red));
            setStateRed({ selected: [], error: false });
        }
    }, [qIndex.red, data]);

    useEffect(() => {
        if (data && data.length > 0) {
            const currentData = data[qIndex.blue % data.length];
            setWordsBlue(generateFloatingWords(currentData.blue));
            setStateBlue({ selected: [], error: false });
        }
    }, [qIndex.blue, data]);

    useEffect(() => {
        let animationFrameId;
        let lastTime = performance.now();

        const animate = (time) => {
            const deltaTime = (time - lastTime) / 1000;
            lastTime = time;

            const moveWords = (words) => words.map(w => {
                let { x, y, vx, vy } = w;
                x += vx * deltaTime;
                y += vy * deltaTime;

                // Bounce off walls
                if (x <= 2) { x = 2; vx = Math.abs(vx); }
                if (x >= 75) { x = 75; vx = -Math.abs(vx); }
                if (y <= 2) { y = 2; vy = Math.abs(vy); }
                if (y >= 75) { y = 75; vy = -Math.abs(vy); }

                return { ...w, x, y, vx, vy };
            });

            setWordsRed(prev => moveWords(prev));
            setWordsBlue(prev => moveWords(prev));

            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    const handleWordClick = (team, wordObj) => {
        if (cooldowns[team] > 0) return;
        
        const currentState = team === 'red' ? stateRed : stateBlue;
        const setState = team === 'red' ? setStateRed : setStateBlue;
        const setWords = team === 'red' ? setWordsRed : setWordsBlue;
        const currentWords = team === 'red' ? wordsRed : wordsBlue;
        
        const newSelected = [...currentState.selected, wordObj];
        setState(prev => ({ ...prev, selected: newSelected }));
        setWords(currentWords.filter(w => w.id !== wordObj.id));
        playSound('pop'); 
    };

    const handleSubmit = (team) => {
        if (cooldowns[team] > 0) return;
        
        const currentState = team === 'red' ? stateRed : stateBlue;
        const setState = team === 'red' ? setStateRed : setStateBlue;
        const targetSentence = team === 'red' ? data[qIndex.red % data.length].red : data[qIndex.blue % data.length].blue;
        
        let isCorrect = currentState.selected.length === targetSentence.length;
        if (isCorrect) {
            for (let i = 0; i < targetSentence.length; i++) {
                if (currentState.selected[i].word !== targetSentence[i]) {
                    isCorrect = false;
                    break;
                }
            }
        }

        if (isCorrect) {
            triggerCooldown(team, true);
            setTimeout(() => {
                setQIndex(prev => ({ ...prev, [team]: prev[team] + 1 }));
                setState({ selected: [], error: false });
            }, COOLDOWN_TIME);
        } else {
            setState(prev => ({ ...prev, error: true }));
            quickFeedback(team, false);
            setTimeout(() => {
                setState(prev => ({ ...prev, error: false }));
            }, 800);
        }
    };

    const undoLast = (team) => {
        if (cooldowns[team] > 0) return;
        const currentState = team === 'red' ? stateRed : stateBlue;
        const setState = team === 'red' ? setStateRed : setStateBlue;
        const setWords = team === 'red' ? setWordsRed : setWordsBlue;
        
        if (currentState.selected.length === 0) return;
        
        const lastWord = currentState.selected[currentState.selected.length - 1];
        setState(prev => ({ ...prev, selected: prev.selected.slice(0, -1) }));
        setWords(prev => [...prev, lastWord]);
    };

    const renderTeamSide = (team) => {
        const isRed = team === 'red';
        const qIdx = isRed ? qIndex.red : qIndex.blue;
        const state = isRed ? stateRed : stateBlue;
        const words = isRed ? wordsRed : wordsBlue;
        const targetLen = data[qIdx % data.length]?.[team]?.length || 0;

        return (
            <div className={`relative flex flex-col h-full w-1/2 p-2 ${isRed ? 'pr-1' : 'pl-1'}`}>
                <div className={`flex-1 rounded-2xl flex flex-col overflow-hidden shadow-xl border-4 ${isRed ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                    <TeamPanelHeader team={team} score={globalScores[team]} roundScore={roundScores[1][team]} qNum={qIdx + 1} />
                    
                    <div className={`p-4 min-h-[140px] bg-white border-b-2 flex flex-col items-center justify-center gap-3 ${state.error ? 'anim-shake bg-orange-100' : ''}`}>
                        <div className="absolute top-2 right-2 text-sm font-bold text-gray-400">
                            {state.selected.length} / {targetLen}
                        </div>
                        <div className="flex flex-wrap gap-2 items-center justify-center">
                            {state.selected.map((w, i) => (
                                        <div key={`sel-${i}`} className="px-4 py-2 bg-gray-800 text-white font-bold text-2xl rounded-lg shadow-md">
                                            {w.word}
                                        </div>
                                    ))}
                                </div>
                                
                                {state.selected.length > 0 && (
                                    <div className="flex gap-3 mt-2">
                                        <button onClick={() => undoLast(team)} className="flex items-center gap-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 font-bold transition-colors">
                                            <Undo className="w-5 h-5" /> Undo
                                        </button>
                                        <button onClick={() => handleSubmit(team)} className="flex items-center gap-1 px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow-md transition-colors">
                                            <Check className="w-5 h-5" /> Submit
                                        </button>
                                    </div>
                                )}
                    </div>

                    <div className="flex-1 relative bg-gradient-to-b from-transparent to-black/5 overflow-hidden">
                        {words.map((w) => (
                            <button
                                key={w.id}
                                        onClick={() => handleWordClick(team, w)}
                                        className={`absolute px-6 py-4 rounded-xl font-bold text-3xl shadow-lg cursor-pointer transform hover:scale-110 transition-transform active:scale-95 ${isRed ? 'bg-red-500 text-white hover:bg-red-400' : 'bg-blue-500 text-white hover:bg-blue-400'}`}
                                        style={{ left: `${w.x}%`, top: `${w.y}%` }}
                                        disabled={cooldowns[team] > 0 || state.selected.some(sel => sel.id === w.id)}
                            >
                                {w.word}
                            </button>
                        ))}
                    </div>
                    
                    <FeedbackDisplay feedback={feedback[team]} />
                    <CooldownOverlay team={team} count={cooldowns[team]} />
                </div>
            </div>
        );
    };

    return (
        <div className="flex w-full h-[calc(100vh-140px)]">
            {renderTeamSide('red')}
            {renderTeamSide('blue')}
        </div>
    );
};

const Round2 = ({ globalScores, roundScores, cooldowns, triggerCooldown, quickFeedback, feedback, awardBonus, data }) => {
    const [qIndex, setQIndex] = useState({ red: 0, blue: 0 });
    const [wrongAnswers, setWrongAnswers] = useState({ red: [], blue: [] });
    const [localWinner, setLocalWinner] = useState(null);
    const hasWon = useRef(false);
    
    // Calculate difference (Red is left, Blue is right)
    const scoreDiff = roundScores[2].red - roundScores[2].blue; 
    
    // Check for win condition (15 points difference = 3 correct questions over)
    useEffect(() => {
        if (!hasWon.current) {
            if (scoreDiff >= 15) {
                hasWon.current = true;
                setLocalWinner('red');
                awardBonus('red', 50);
            } else if (scoreDiff <= -15) {
                hasWon.current = true;
                setLocalWinner('blue');
                awardBonus('blue', 50);
            }
        }
    }, [scoreDiff, awardBonus]);

    const handleOptionClick = (team, option) => {
        if (cooldowns[team] > 0 || localWinner) return; 
        
        const currentQ = data[qIndex[team] % data.length]?.[team];
        if (!currentQ) return;
        
        if (wrongAnswers[team].includes(option)) return; 

        if (option === currentQ.answer) {
            triggerCooldown(team, true);
            setTimeout(() => {
                setQIndex(prev => ({ ...prev, [team]: prev[team] + 1 }));
                setWrongAnswers(prev => ({ ...prev, [team]: [] }));
            }, COOLDOWN_TIME); 
        } else {
            quickFeedback(team, false);
            setWrongAnswers(prev => ({ ...prev, [team]: [...prev[team], option] }));
        }
    };

    const renderTeamSide = (team) => {
        const isRed = team === 'red';
        const qIdx = qIndex[team];
        const currentQ = data[qIdx % data.length]?.[team];

        return (
            <div className={`relative flex-1 rounded-2xl flex flex-col overflow-hidden shadow-xl border-4 ${isRed ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                <TeamPanelHeader team={team} score={globalScores[team]} roundScore={roundScores[2][team]} qNum={qIdx + 1} />
                
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative z-10">
                    <div className="text-4xl font-bold mb-12 text-slate-800 leading-relaxed max-w-lg">
                        {currentQ?.text?.split('___').map((part, i, arr) => (
                            <React.Fragment key={i}>
                                {part}
                                {i < arr.length - 1 && (
                                    <span className="inline-block w-24 border-b-4 border-slate-400 mx-2"></span>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                    <div className="flex gap-4 flex-wrap justify-center">
                        {currentQ?.options?.map((opt, i) => {
                            const isWrong = wrongAnswers[team].includes(opt);
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => handleOptionClick(team, opt)}
                                            disabled={isWrong || cooldowns[team] > 0}
                                            className={`px-8 py-4 rounded-xl text-3xl font-black shadow-lg transition-transform active:scale-95
                                                ${isWrong ? 'bg-gray-300 text-gray-500 opacity-50 cursor-not-allowed' 
                                                            : isRed ? 'bg-red-500 hover:bg-red-400 text-white hover:scale-105' 
                                                                    : 'bg-blue-500 hover:bg-blue-400 text-white hover:scale-105'}
                                            `}
                                        >
                                            {opt}
                                        </button>
                                    )
                                })}
                            </div>
                </div>
                <FeedbackDisplay feedback={feedback[team]} />
                <CooldownOverlay team={team} count={cooldowns[team]} />
            </div>
        );
    };

    return (
        <div className="flex flex-col w-full h-[calc(100vh-140px)] p-2 gap-2 relative">
            
            {/* Win Overlay */}
            {localWinner && (
                <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center backdrop-blur-sm rounded-xl">
                    <div className={`text-8xl font-black mb-8 ${localWinner === 'red' ? 'text-red-500' : 'text-blue-500'} animate-bounce`}>
                        TEAM {localWinner.toUpperCase()} WINS!
                    </div>
                    <div className="text-6xl font-black text-yellow-400 bg-white/10 px-12 py-6 rounded-full border-4 border-yellow-400 shadow-[0_0_50px_rgba(250,204,21,0.5)]" style={{ animation: 'scorePop 1s ease-out' }}>
                        +50 MARKS AWARDED!
                    </div>
                </div>
            )}

            <div className="h-[200px] bg-sky-100 rounded-xl shadow-inner relative flex flex-col items-center justify-center overflow-hidden border-4 border-gray-300 mb-2 shrink-0">
                {/* Center line marker */}
                <div className="absolute h-full w-2 bg-black/20 z-0 border-x border-white/50"></div>

                {/* CSS Rope - Multiplies diff by -3 so if Red(left) scores positive diff, it translates negatively (leftwards) */}
                <div 
                    className="w-[50%] h-6 bg-[repeating-linear-gradient(45deg,#8B4513,#8B4513_10px,#A0522D_10px,#A0522D_20px)] rounded-full relative flex items-center justify-between z-10 shadow-[0_10px_20px_rgba(0,0,0,0.3)]"
                    style={{
                        transform: `translateX(${scoreDiff * -3}%)`,
                        transition: 'transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                >
                    <div className="absolute -left-16 -top-8 text-7xl drop-shadow-lg">🔴</div>
                    <div className="absolute -right-16 -top-8 text-7xl drop-shadow-lg">🔵</div>
                    {/* The Knot */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-16 bg-yellow-400 rounded-md border-4 border-orange-900 shadow-xl"></div>
                </div>

                <div className="absolute left-8 bottom-4 text-2xl font-black text-red-700 opacity-40 tracking-widest z-10">TEAM RED</div>
                <div className="absolute right-8 bottom-4 text-2xl font-black text-blue-700 opacity-40 tracking-widest z-10">TEAM BLUE</div>
            </div>

            <div className="flex flex-1 gap-2 min-h-0">
                {renderTeamSide('red')}
                {renderTeamSide('blue')}
            </div>
        </div>
    );
};

const Round3 = ({ globalScores, roundScores, updateScore, playSound, data }) => {
    const [targetCategory, setTargetCategory] = useState('NOUN');
    const GRAMMAR_CATEGORIES = useMemo(() => Object.keys(data), [data]);

    const [balloonsRed, setBalloonsRed] = useState([]);
    const [balloonsBlue, setBalloonsBlue] = useState([]);
    const [popScoresRed, setPopScoresRed] = useState([]);
    const [popScoresBlue, setPopScoresBlue] = useState([]);
    
    const balloonIdCounter = useRef(0);

    const generateBalloon = (team) => {
        const isTarget = Math.random() > 0.4;
        const category = isTarget ? targetCategory : GRAMMAR_CATEGORIES[Math.floor(Math.random() * GRAMMAR_CATEGORIES.length)];
        const wordList = data[category];
        const word = wordList[Math.floor(Math.random() * wordList.length)];
        const colorObj = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
        
        balloonIdCounter.current += 1;
        
        return {
            id: `b-${balloonIdCounter.current}`,
            word,
            category,
            left: `${5 + Math.random() * 70}%`,
            speed: 8 + Math.random() * 6,
            colorObj,
            popped: false
        };
    };

    useEffect(() => {
        const spawnRate = 2000;
        const spawnBalloons = () => {
            setBalloonsRed(prev => [...prev.filter(b => !b.popped).slice(-15), generateBalloon('red')]);
            setBalloonsBlue(prev => [...prev.filter(b => !b.popped).slice(-15), generateBalloon('blue')]);
        };
        
        const interval = setInterval(spawnBalloons, spawnRate);
        return () => clearInterval(interval);
    }, [targetCategory, data, GRAMMAR_CATEGORIES]);

    const handleBalloonClick = (e, team, balloon) => {
        if (balloon.popped) return;

        const isCorrect = balloon.category === targetCategory;
        
        const rect = e.currentTarget.getBoundingClientRect();
        const parentRect = e.currentTarget.parentElement.getBoundingClientRect();
        const x = rect.left - parentRect.left + (rect.width / 2) - 20; 
        const y = rect.top - parentRect.top;
        
        const newScore = {
            id: Date.now() + Math.random(),
            isCorrect,
            marks: isCorrect ? '+5' : '-2',
            left: `${x}px`,
            top: `${y}px`
        };
        
        const setScores = team === 'red' ? setPopScoresRed : setPopScoresBlue;
        setScores(prev => [...prev, newScore]);
        setTimeout(() => setScores(prev => prev.filter(s => s.id !== newScore.id)), 1000);

        const setBalloons = team === 'red' ? setBalloonsRed : setBalloonsBlue;
        setBalloons(prev => prev.map(b => b.id === balloon.id ? { ...b, popped: true } : b));
        
        updateScore(team, isCorrect ? 5 : -2);
        playSound(isCorrect ? 'correct' : 'wrong');
    };

    const renderTeamSide = (team) => {
        const isRed = team === 'red';
        const balloons = isRed ? balloonsRed : balloonsBlue;
        const popScores = isRed ? popScoresRed : popScoresBlue;

        return (
            <div className={`relative flex flex-col h-full w-1/2 p-2 ${isRed ? 'pr-1' : 'pl-1'}`}>
                <div className={`flex-1 rounded-2xl flex flex-col overflow-hidden shadow-xl border-4 ${isRed ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                    <TeamPanelHeader team={team} score={globalScores[team]} roundScore={roundScores[3][team]} />
                    
                    <div className="flex-1 relative overflow-hidden bg-gradient-to-t from-sky-200 to-white">
                        {popScores.map(score => (
                            <div key={score.id} className={`absolute z-50 font-black text-6xl anim-local-score ${score.isCorrect ? 'text-green-500' : 'text-red-500'}`} 
                                 style={{ left: score.left, top: score.top, textShadow: '0 4px 10px rgba(0,0,0,0.3), 0 0 20px white' }}>
                                {score.marks}
                            </div>
                        ))}
                    
                        {balloons.map(b => (
                            <div 
                                key={b.id}
                                onClick={(e) => handleBalloonClick(e, team, b)}
                                className="absolute cursor-pointer flex flex-col items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95"
                                style={{
                                    left: b.left,
                                    width: '100px',
                                    height: '120px',
                                    borderRadius: '50% 50% 50% 50% / 40% 40% 60% 60%',
                                    background: `radial-gradient(circle at 35% 25%, #ffffff 0%, ${b.colorObj.hex} 30%, ${b.colorObj.dark} 90%)`,
                                    boxShadow: 'inset -5px -5px 15px rgba(0,0,0,0.4), 3px 3px 10px rgba(0,0,0,0.2)',
                                    animation: b.popped ? 'pop 0.2s forwards' : `rise ${b.speed}s linear forwards`,
                                    bottom: '-150px'
                                }}
                            >
                                <div className="absolute -bottom-3 w-4 h-4 z-0" style={{
                                    background: b.colorObj.dark,
                                    clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                                }}></div>
                                <div className="absolute -bottom-10 w-0.5 h-10 bg-gray-600/40 z-0"></div>
                                <span className="text-white font-black text-xl z-10 uppercase text-center px-1 drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]">{b.word}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col w-full h-[calc(100vh-140px)]">
            <div className="h-16 bg-slate-800 text-white flex items-center justify-center gap-4 px-4 m-2 rounded-xl shadow-lg z-10">
                <span className="font-bold text-slate-300">TARGET:</span>
                {GRAMMAR_CATEGORIES.map(cat => (
                    <button 
                        key={cat}
                        onClick={() => setTargetCategory(cat)}
                        className={`px-6 py-2 rounded-full font-bold transition-colors ${targetCategory === cat ? 'bg-yellow-400 text-slate-900 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'bg-slate-700 hover:bg-slate-600'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
            
            <div className="flex flex-1">
                {renderTeamSide('red')}
                {renderTeamSide('blue')}
            </div>
        </div>
    );
};

const TopBar = ({ currentRound, setCurrentRound }) => {
    const titles = ["Main Menu", "ROUND 1 — SENTENCE SCRAMBLE", "ROUND 2 — ENGLISH TUG OF WAR", "ROUND 3 — POP THE BALLOON", "GAME COMPLETE"];
    return (
        <div className="h-16 bg-slate-900 text-white flex items-center justify-between px-8 shadow-md z-50">
            <div className="text-2xl font-black tracking-widest text-yellow-400 flex items-center gap-3 w-1/3">
                <Trophy className="text-yellow-400" />
                ENGLISH GAME SHOW
            </div>
            <div className="text-xl font-bold bg-white/10 px-6 py-2 rounded-full flex-shrink-0">
                {titles[currentRound]}
            </div>
            <div className="flex gap-3 w-1/3 justify-end">
                {currentRound > 0 && currentRound < 4 && (
                    <>
                        <button onClick={() => setCurrentRound(prev => Math.min(4, prev + 1))} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-full font-bold text-sm transition-colors shadow-lg">
                            Next Round <SkipForward size={16}/>
                        </button>
                        <button onClick={() => setCurrentRound(4)} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-5 py-2 rounded-full font-bold text-sm transition-colors shadow-lg">
                            Finish Game <Check size={16}/>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

const GlobalScoreboard = ({ globalScores, currentRound }) => {
    return (
        <div className="h-20 bg-slate-900 flex items-center justify-center gap-12 px-8 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50">
            <div className="flex items-center gap-6">
                <div className="text-red-500 font-black text-3xl tracking-widest">RED</div>
                <div className="bg-red-600 text-white font-black text-5xl px-6 py-2 rounded-xl min-w-[120px] text-center shadow-[inset_0_4px_4px_rgba(0,0,0,0.3)]">
                    {globalScores.red}
                </div>
            </div>
            
            <div className="flex flex-col gap-1 items-center bg-slate-800 p-2 rounded-lg">
               <div className="text-[10px] font-bold text-slate-400 uppercase">Rounds</div>
               <div className="flex gap-2">
                   {[1, 2, 3].map(r => (
                       <div key={r} className={`w-3 h-3 rounded-full ${currentRound >= r ? 'bg-yellow-400' : 'bg-slate-600'}`}></div>
                   ))}
               </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="bg-blue-600 text-white font-black text-5xl px-6 py-2 rounded-xl min-w-[120px] text-center shadow-[inset_0_4px_4px_rgba(0,0,0,0.3)]">
                    {globalScores.blue}
                </div>
                <div className="text-blue-500 font-black text-3xl tracking-widest">BLUE</div>
            </div>
        </div>
    );
};

const TeacherControlsPanel = ({ setCurrentRound, updateScore, settings, setSettings, setGlobalScores, setRoundScores, onOpenAI }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-4 bg-slate-800 text-white p-3 rounded-full shadow-2xl opacity-50 hover:opacity-100 transition-opacity z-50"
            >
                <Settings />
            </button>
        );
    }

    return (
        <div className="fixed bottom-24 right-4 bg-white rounded-2xl shadow-2xl p-4 w-80 border-2 border-slate-200 z-50 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Settings size={18}/> Teacher Controls</h3>
                <button onClick={() => setIsOpen(false)}><X className="text-slate-500 hover:text-slate-800"/></button>
            </div>
            
            <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                    <span className="font-semibold">Game Flow:</span>
                    <div className="flex gap-2">
                        <button onClick={() => setCurrentRound(prev => Math.min(4, prev + 1))} className="bg-slate-800 text-white px-3 py-1 rounded flex items-center gap-1 hover:bg-slate-700">
                            Next Round <ChevronRight size={14}/>
                        </button>
                    </div>
                </div>
                
                <div className="bg-slate-50 p-2 rounded space-y-2">
                    <span className="font-semibold">Manual Scoring:</span>
                    <div className="flex justify-between gap-2">
                        <div className="flex gap-1">
                            <button onClick={() => updateScore('red', 5)} className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold hover:bg-red-200">+5</button>
                            <button onClick={() => updateScore('red', -2)} className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold hover:bg-red-200">-2</button>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => updateScore('blue', 5)} className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold hover:bg-blue-200">+5</button>
                            <button onClick={() => updateScore('blue', -2)} className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold hover:bg-blue-200">-2</button>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 p-2 rounded space-y-2">
                    <span className="font-semibold">Settings:</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={settings.minScoreZero} onChange={(e) => setSettings(s => ({...s, minScoreZero: e.target.checked}))} />
                        Minimum score is 0
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={settings.skipCooldown} onChange={(e) => setSettings(s => ({...s, skipCooldown: e.target.checked}))} />
                        Skip 3s Cooldown (Debug)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={settings.sound} onChange={(e) => setSettings(s => ({...s, sound: e.target.checked}))} />
                        Sound Effects
                    </label>
                </div>
                
                <button 
                    onClick={onOpenAI}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-2 rounded font-bold hover:from-indigo-600 hover:to-purple-600 flex items-center justify-center gap-2 shadow-md"
                >
                    <Bot size={16}/> AI Question Generator
                </button>
                
                <button 
                    onClick={() => {
                        setGlobalScores({red: 0, blue: 0});
                        setRoundScores({1: {red: 0, blue: 0}, 2: {red: 0, blue: 0}, 3: {red: 0, blue: 0}});
                        setCurrentRound(0);
                    }} 
                    className="w-full bg-red-100 text-red-700 py-2 rounded font-bold hover:bg-red-200 flex items-center justify-center gap-2"
                >
                    <RotateCcw size={16}/> Reset Entire Game
                </button>
            </div>
        </div>
    );
};

const Confetti = () => {
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-yellow-400', 'bg-green-500', 'bg-purple-500', 'bg-pink-500'];
    return (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            {Array.from({ length: 150 }).map((_, i) => (
                <div
                    key={i}
                    className={`absolute w-4 h-4 rounded-sm shadow-md ${colors[Math.floor(Math.random() * colors.length)]}`}
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: `-20px`,
                        animation: `confetti-fall ${2 + Math.random() * 4}s linear ${Math.random() * 3}s infinite`
                    }}
                ></div>
            ))}
        </div>
    );
};

export default function EnglishGameShow() {
    useEffect(() => { injectGlobalStyles(); }, []);

    // Game Data State
    const [r1Data, setR1Data] = useState(DEFAULT_R1_SENTENCES);
    const [r2Data, setR2Data] = useState(DEFAULT_R2_QUESTIONS);
    const [r3Data, setR3Data] = useState(DEFAULT_R3_VOCAB);

    // Global State
    const [currentRound, setCurrentRound] = useState(0);
    const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false);
    const [globalScores, setGlobalScores] = useState({ red: 0, blue: 0 });
    const [roundScores, setRoundScores] = useState({
        1: { red: 0, blue: 0 },
        2: { red: 0, blue: 0 },
        3: { red: 0, blue: 0 }
    });
    
    const [settings, setSettings] = useState({
        minScoreZero: true,
        skipCooldown: false,
        sound: true
    });

    // Cooldown State
    const [cooldowns, setCooldowns] = useState({ red: 0, blue: 0 });
    const [feedback, setFeedback] = useState({ red: null, blue: null }); 

    const playSound = useCallback((type) => {
        if (!settings.sound) return;
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        if (type === 'correct') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } else if (type === 'wrong') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } else if (type === 'pop') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        }
    }, [settings.sound]);

    const awardBonus = useCallback((team, amount) => {
        setGlobalScores(prev => ({ ...prev, [team]: prev[team] + amount }));
        playSound('correct'); 
    }, [playSound]);

    const updateScore = useCallback((team, amount) => {
        setGlobalScores(prev => {
            let newScore = prev[team] + amount;
            if (settings.minScoreZero && newScore < 0) newScore = 0;
            return { ...prev, [team]: newScore };
        });
        
        if (currentRound > 0 && currentRound <= 3) {
            setRoundScores(prev => {
                const newRound = { ...prev };
                let newRoundScore = newRound[currentRound][team] + amount;
                if (settings.minScoreZero && newRoundScore < 0) newRoundScore = 0;
                // Pure update to avoid shallow copy bugs
                newRound[currentRound] = {
                    ...newRound[currentRound],
                    [team]: newRoundScore
                };
                return newRound;
            });
        }
    }, [settings.minScoreZero, currentRound]);

    const triggerCooldown = useCallback((team, isCorrect) => {
        const amount = isCorrect ? SCORE_CORRECT : SCORE_WRONG;
        updateScore(team, amount);
        playSound(isCorrect ? 'correct' : 'wrong');
        
        setFeedback(prev => ({ ...prev, [team]: { type: isCorrect ? 'correct' : 'wrong', marks: amount } }));
        
        if (!settings.skipCooldown) {
            setCooldowns(prev => ({ ...prev, [team]: 3 }));
        } else {
            setTimeout(() => setFeedback(prev => ({ ...prev, [team]: null })), 1000);
        }
    }, [settings.skipCooldown, updateScore, playSound]);

    const quickFeedback = useCallback((team, isCorrect) => {
        const amount = isCorrect ? SCORE_CORRECT : SCORE_WRONG;
        updateScore(team, amount);
        playSound(isCorrect ? 'correct' : 'wrong');
        
        setFeedback(prev => ({ ...prev, [team]: { type: isCorrect ? 'correct' : 'wrong', marks: amount } }));
        setTimeout(() => {
            setFeedback(prev => ({ ...prev, [team]: null }));
        }, 1000);
    }, [updateScore, playSound]);

    useEffect(() => {
        let interval;
        if (cooldowns.red > 0 || cooldowns.blue > 0) {
            interval = setInterval(() => {
                setCooldowns(prev => {
                    const next = {
                        red: Math.max(0, prev.red - 1),
                        blue: Math.max(0, prev.blue - 1)
                    };
                    if (next.red === 0) setFeedback(f => ({ ...f, red: null }));
                    if (next.blue === 0) setFeedback(f => ({ ...f, blue: null }));
                    return next;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [cooldowns]);

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none overflow-hidden">
            <TopBar currentRound={currentRound} setCurrentRound={setCurrentRound} />
            
            <main className="flex-1 relative">
                {currentRound === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-900 text-white">
                        <Trophy size={120} className="text-yellow-400 mb-8 animate-bounce" />
                        <h1 className="text-7xl font-black mb-12 tracking-tighter drop-shadow-lg">
                            <span className="text-red-500">RED</span> VS <span className="text-blue-500">BLUE</span>
                        </h1>
                        <button 
                            onClick={() => setCurrentRound(1)}
                            className="bg-yellow-400 text-slate-900 px-12 py-6 rounded-full text-4xl font-black shadow-[0_10px_0_#b45309] hover:translate-y-2 hover:shadow-[0_2px_0_#b45309] transition-all"
                        >
                            START GAME
                        </button>
                    </div>
                )}

                {currentRound === 1 && <Round1 globalScores={globalScores} roundScores={roundScores} cooldowns={cooldowns} triggerCooldown={triggerCooldown} quickFeedback={quickFeedback} feedback={feedback} playSound={playSound} data={r1Data} />}
                {currentRound === 2 && <Round2 globalScores={globalScores} roundScores={roundScores} cooldowns={cooldowns} triggerCooldown={triggerCooldown} quickFeedback={quickFeedback} feedback={feedback} awardBonus={awardBonus} data={r2Data} />}
                {currentRound === 3 && <Round3 globalScores={globalScores} roundScores={roundScores} updateScore={updateScore} playSound={playSound} data={r3Data} />}

                {currentRound === 4 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-white z-40 overflow-hidden">
                        <Confetti />
                        
                        {(() => {
                            const winner = globalScores.red > globalScores.blue ? 'red' : globalScores.blue > globalScores.red ? 'blue' : 'tie';
                            
                            return (
                                <>
                                    <h2 className="text-7xl font-black mb-12 text-yellow-400 drop-shadow-lg" style={{ animation: 'trophy-bounce 2s infinite' }}>
                                        {winner === 'tie' ? "IT'S A TIE! 🤝" : `TEAM ${winner.toUpperCase()} WINS! 🏆`}
                                    </h2>
                                    
                                    <div className="flex gap-16 mb-16 relative z-20 items-end">
                                        <div className={`flex flex-col items-center bg-red-600 p-8 rounded-3xl shadow-2xl transition-all duration-1000 ${winner === 'red' ? 'scale-125 border-8 border-yellow-400 text-yellow-200 pulse-glow mb-8' : winner === 'blue' ? 'opacity-50 scale-90 saturate-50' : ''}`}>
                                            <span className="text-3xl font-bold mb-4">TEAM RED</span>
                                            <span className="text-8xl font-black">{globalScores.red}</span>
                                        </div>
                                        <div className={`flex flex-col items-center bg-blue-600 p-8 rounded-3xl shadow-2xl transition-all duration-1000 ${winner === 'blue' ? 'scale-125 border-8 border-yellow-400 text-yellow-200 pulse-glow mb-8' : winner === 'red' ? 'opacity-50 scale-90 saturate-50' : ''}`}>
                                            <span className="text-3xl font-bold mb-4">TEAM BLUE</span>
                                            <span className="text-8xl font-black">{globalScores.blue}</span>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}

                        <div className="bg-white/10 p-8 rounded-2xl backdrop-blur-md border border-white/20 relative z-20 shadow-2xl">
                            <table className="w-[700px] text-xl">
                                <thead>
                                    <tr className="border-b-2 border-white/40 text-left text-gray-200">
                                        <th className="pb-4 uppercase tracking-widest text-sm">Round Breakdown</th>
                                        <th className="pb-4 text-center text-red-400 font-black">RED</th>
                                        <th className="pb-4 text-center text-blue-400 font-black">BLUE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-white/10">
                                        <td className="py-4">1. Sentence Scramble</td>
                                        <td className="py-4 text-center font-bold">{roundScores[1].red}</td>
                                        <td className="py-4 text-center font-bold">{roundScores[1].blue}</td>
                                    </tr>
                                    <tr className="border-b border-white/10">
                                        <td className="py-4">2. Tug of War</td>
                                        <td className="py-4 text-center font-bold">{roundScores[2].red}</td>
                                        <td className="py-4 text-center font-bold">{roundScores[2].blue}</td>
                                    </tr>
                                    <tr className="border-b border-white/10">
                                        <td className="py-4">3. Pop the Balloon</td>
                                        <td className="py-4 text-center font-bold">{roundScores[3].red}</td>
                                        <td className="py-4 text-center font-bold">{roundScores[3].blue}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            <TeacherControlsPanel 
                setCurrentRound={setCurrentRound} 
                updateScore={updateScore} 
                settings={settings} 
                setSettings={setSettings} 
                setGlobalScores={setGlobalScores} 
                setRoundScores={setRoundScores} 
                onOpenAI={() => setIsAIGeneratorOpen(true)}
            />
            <GlobalScoreboard globalScores={globalScores} currentRound={currentRound} />
            
            {isAIGeneratorOpen && (
                <AIGeneratorModal 
                    onClose={() => setIsAIGeneratorOpen(false)}
                    onDataGenerated={(data) => {
                        setR1Data(data.round1);
                        setR2Data(data.round2);
                        setR3Data(data.round3);
                        
                        setGlobalScores({red: 0, blue: 0});
                        setRoundScores({1: {red: 0, blue: 0}, 2: {red: 0, blue: 0}, 3: {red: 0, blue: 0}});
                        setCurrentRound(0);
                        setIsAIGeneratorOpen(false);
                    }}
                />
            )}
        </div>
    );
}