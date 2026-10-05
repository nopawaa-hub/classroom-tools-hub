import React, { useState, useEffect, useRef } from 'react';

// The 8 sentences for the listening activity
const sentences = [
  { id: 1, text: "I can see a big blue boat.", object: "boat", size: "big", color: "blue" },
  { id: 2, text: "I can see a small red ball.", object: "ball", size: "small", color: "red" },
  { id: 3, text: "I can see a big yellow umbrella.", object: "umbrella", size: "big", color: "yellow" },
  { id: 4, text: "I can see a small green bucket.", object: "bucket", size: "small", color: "green" },
  { id: 5, text: "I can see a small blue boat.", object: "boat", size: "small", color: "blue" },
  { id: 6, text: "I can see a big red ball.", object: "ball", size: "big", color: "red" },
  { id: 7, text: "I can see a small yellow shell.", object: "shell", size: "small", color: "yellow" },
  { id: 8, text: "I can see a big green umbrella.", object: "umbrella", size: "big", color: "green" }
];

// Helper to convert base64 to ArrayBuffer
const base64ToArrayBuffer = (base64) => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// Helper to convert raw PCM16 to WAV format
const pcmToWav = (pcmData, sampleRate) => {
  const numChannels = 1; // Assuming mono for TTS
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = pcmData.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM data
  let offset = 44;
  for (let i = 0; i < pcmData.length; i++, offset += 2) {
    view.setInt16(offset, pcmData[i], true);
  }

  return new Blob([view], { type: 'audio/wav' });
};

const writeString = (view, offset, string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

export default function App() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [hasListened, setHasListened] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [options, setOptions] = useState([]);
  const [activityComplete, setActivityComplete] = useState(false);
  
  const [imageCache, setImageCache] = useState({});
  const [loadingImages, setLoadingImages] = useState(false);
  
  const audioRef = useRef(null);

  // Fetch image from Gemini 3.1 Flash Image (nano banana)
  const fetchImageFromGemini = async (size, color, object) => {
    const prompt = `A cute, clear, and simple 2d flat vector illustration of a ${size} ${color} ${object} on a pure white background. High quality, suitable for a children's learning game. No text.`;
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: { aspectRatio: "1:1" }
        }
    };
    const apiKey = (localStorage.getItem('cth_gemini_key')||"");
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`;

    const fetchWithRetry = async (retries = 3, delay = 1000) => {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            return await response.json();
        } catch (e) {
            if (retries > 0) {
                await new Promise(r => setTimeout(r, delay));
                return fetchWithRetry(retries - 1, delay * 2);
            }
            throw e;
        }
    };

    try {
        const result = await fetchWithRetry();
        const part = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (part) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    } catch (error) {
        // Silently fail or return null to trigger fallback/error state
    }
    return null;
  };

  const loadImagesForOptions = async (opts, currentCache) => {
    setLoadingImages(true);
    const newCache = { ...currentCache };
    let updated = false;

    // Fetch images in parallel for faster load times
    await Promise.all(opts.map(async (opt) => {
        if (!newCache[opt.imageId]) {
            const base64 = await fetchImageFromGemini(opt.size, opt.color, opt.object);
            if (base64) {
                newCache[opt.imageId] = base64;
                updated = true;
            }
        }
    }));

    if (updated) {
        setImageCache(prev => ({ ...prev, ...newCache }));
    }
    setLoadingImages(false);
  };

  // Generate options for the current question
  useEffect(() => {
    if (activityComplete) return;

    const currentSentence = sentences[currentQuestionIndex];
    
    // Create distractor options
    const generateDistractor = () => {
      const sizes = ['big', 'small'];
      const colors = ['blue', 'red', 'yellow', 'green'];
      const objects = ['boat', 'ball', 'umbrella', 'bucket', 'shell'];
      
      let s, c, o;
      do {
        s = sizes[Math.floor(Math.random() * sizes.length)];
        c = colors[Math.floor(Math.random() * colors.length)];
        o = objects[Math.floor(Math.random() * objects.length)];
      } while (
        s === currentSentence.size && 
        c === currentSentence.color && 
        o === currentSentence.object
      );
      
      return { size: s, color: c, object: o, id: `${s}-${c}-${o}-${Math.random()}`, imageId: `${s}-${c}-${o}` };
    };

    const newOptions = [
      { size: currentSentence.size, color: currentSentence.color, object: currentSentence.object, isCorrect: true, id: 'correct', imageId: `${currentSentence.size}-${currentSentence.color}-${currentSentence.object}` },
      generateDistractor(),
      generateDistractor(),
      generateDistractor()
    ];

    // Shuffle options
    const shuffledOptions = newOptions.sort(() => Math.random() - 0.5);
    setOptions(shuffledOptions);
    
    // Reset state for new question
    setHasListened(false);
    setAudioUrl(null);
    setFeedback(null);
    if (audioRef.current) {
        audioRef.current.src = "";
    }
    
    // Load the AI images
    setImageCache(currentCache => {
        loadImagesForOptions(shuffledOptions, currentCache);
        return currentCache;
    });

  }, [currentQuestionIndex, activityComplete]);

  // Function to fetch audio from Gemini TTS
  const fetchAudio = async () => {
    if (audioUrl) {
      playAudio();
      return;
    }

    setIsLoadingAudio(true);
    setFeedback(null);
    const currentSentence = sentences[currentQuestionIndex].text;
    
    // Prompt instructs the model for a British accent, clear articulation, and slightly slower pace
    const prompt = `Speak the following sentence with a clear British English accent, suitable for young learners. Speak warmly, clearly, and slightly slowly: "${currentSentence}"`;

    const payload = {
        contents: [{
            parts: [{ text: prompt }]
        }],
        generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: {
                    // Using 'Aoede' (female, relaxed/natural) or 'Kore' (female, firm/clear). 
                    // Let's use a clear, warm voice.
                    prebuiltVoiceConfig: { voiceName: "Aoede" }
                }
            }
        },
        model: "gemini-2.5-flash-preview-tts"
    };

    const apiKey = (localStorage.getItem('cth_gemini_key')||""); // Canvas handles this
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
             throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();
        const part = result?.candidates?.[0]?.content?.parts?.[0];
        
        if (part && part.inlineData && part.inlineData.data) {
            const audioBase64 = part.inlineData.data;
            const mimeType = part.inlineData.mimeType;
            
            // Extract sample rate (usually 24000 for Gemini)
            const sampleRateMatch = mimeType.match(/rate=(\d+)/);
            const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 24000;
            
            const pcmBuffer = base64ToArrayBuffer(audioBase64);
            const pcm16 = new Int16Array(pcmBuffer);
            const wavBlob = pcmToWav(pcm16, sampleRate);
            
            const newAudioUrl = URL.createObjectURL(wavBlob);
            setAudioUrl(newAudioUrl);
            setHasListened(true);
            
            // Wait for state to update before playing
            setTimeout(() => {
                playAudio(newAudioUrl);
            }, 100);
            
        } else {
            throw new Error("No audio data in response");
        }
    } catch (error) {
        console.error("Error generating audio:", error);
        setFeedback({ type: 'error', text: "Sorry, there was a problem loading the audio. Please try again." });
    } finally {
        setIsLoadingAudio(false);
    }
  };

  const playAudio = (urlToPlay = audioUrl) => {
    if (audioRef.current && urlToPlay) {
      if (audioRef.current.src !== urlToPlay) {
          audioRef.current.src = urlToPlay;
      }
      setIsPlaying(true);
      audioRef.current.play().catch(e => {
          console.error("Playback failed:", e);
          setIsPlaying(false);
      });
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleOptionClick = (option) => {
    if (!hasListened) {
        setFeedback({ type: 'warning', text: "Please listen to the audio first!" });
        return;
    }
    
    if (showResult) return; // Prevent multiple clicks

    if (option.isCorrect) {
        setScore(score + 1);
        setFeedback({ type: 'success', text: "Well done! That's correct." });
        setShowResult(true);
        
        setTimeout(() => {
            if (currentQuestionIndex < sentences.length - 1) {
                setCurrentQuestionIndex(currentQuestionIndex + 1);
                setShowResult(false);
            } else {
                setActivityComplete(true);
            }
        }, 2000);
    } else {
        setFeedback({ type: 'error', text: "Oops, try again!" });
    }
  };

  const restartActivity = () => {
      setCurrentQuestionIndex(0);
      setScore(0);
      setActivityComplete(false);
      setShowResult(false);
      setFeedback(null);
  };

  if (activityComplete) {
      return (
          <div className="min-h-screen bg-sky-100 flex items-center justify-center p-4 font-sans text-slate-800">
              <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center border-4 border-sky-300">
                  <h1 className="text-4xl font-bold text-sky-600 mb-6">Activity Complete!</h1>
                  <p className="text-2xl mb-8">You scored <span className="font-bold text-green-500">{score}</span> out of {sentences.length}</p>
                  
                  <div className="flex justify-center mb-8">
                     <div className="text-6xl">
                         {score === sentences.length ? '🌟🏆🌟' : score > sentences.length / 2 ? '⭐👍⭐' : '💪📚'}
                     </div>
                  </div>

                  <button 
                      onClick={restartActivity}
                      className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-4 px-8 rounded-full text-xl transition transform hover:scale-105 active:scale-95 shadow-md"
                  >
                      Play Again
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col items-center py-10 px-4 font-sans text-slate-800">
      <audio 
        ref={audioRef} 
        onEnded={handleAudioEnded}
        onError={() => setIsPlaying(false)}
      />

      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm border-2 border-sky-200">
            <h1 className="text-2xl md:text-3xl font-bold text-sky-700">Listen and Find</h1>
            <div className="text-lg md:text-xl font-semibold bg-sky-100 text-sky-800 py-2 px-4 rounded-full">
                Question {currentQuestionIndex + 1} of {sentences.length}
            </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-3xl shadow-lg p-6 md:p-10 border-b-8 border-sky-200">
            
            {/* Audio Section */}
            <div className="flex flex-col items-center mb-10">
                <p className="text-xl md:text-2xl text-center mb-6 text-slate-600 font-medium">
                    Click to hear the sentence, then choose the right picture.
                </p>
                
                <button 
                    onClick={fetchAudio}
                    disabled={isLoadingAudio || showResult}
                    className={`
                        flex items-center justify-center gap-4
                        w-64 h-24 rounded-full text-2xl font-bold text-white
                        transition-all transform
                        ${isPlaying ? 'bg-green-500 scale-105 shadow-[0_0_20px_rgba(34,197,94,0.6)]' : 'bg-sky-500 hover:bg-sky-400 hover:scale-105 shadow-[0_8px_0_#0284c7] hover:shadow-[0_4px_0_#0284c7] hover:translate-y-1'}
                        ${isLoadingAudio ? 'opacity-70 cursor-wait' : ''}
                        ${showResult ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    {isLoadingAudio ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-white"></div>
                    ) : isPlaying ? (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            </svg>
                            Listening...
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Play Audio
                        </>
                    )}
                </button>
            </div>

            {/* Feedback Message */}
        <div className="h-12 mb-6 flex items-center justify-center">
            {feedback && (
                <div className={`
                    px-6 py-3 rounded-full text-lg font-bold animate-bounce
                    ${feedback.type === 'error' ? 'bg-red-100 text-red-600 border-2 border-red-300' : ''}
                    ${feedback.type === 'warning' ? 'bg-amber-100 text-amber-700 border-2 border-amber-300' : ''}
                    ${feedback.type === 'success' ? 'bg-green-100 text-green-700 border-2 border-green-300' : ''}
                `}>
                    {feedback.text}
                </div>
            )}
        </div>

        {/* Picture Options Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {options.map((option, index) => (
                <button
                    key={option.id}
                    onClick={() => handleOptionClick(option)}
                    disabled={!hasListened || showResult || loadingImages}
                    className={`
                        aspect-square rounded-2xl border-4 p-4 transition-all overflow-hidden
                        flex flex-col items-center justify-center bg-white
                        ${!hasListened || loadingImages ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:scale-105 hover:shadow-lg hover:border-sky-400 cursor-pointer'}
                        ${showResult && option.isCorrect ? 'border-green-500 bg-green-50 scale-105 shadow-xl ring-4 ring-green-200' : 'border-sky-200'}
                        ${showResult && !option.isCorrect ? 'opacity-30 border-slate-200' : ''}
                    `}
                >
                    {loadingImages && !imageCache[option.imageId] ? (
                         <div className="flex flex-col items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-sky-400 mb-2"></div>
                            <span className="text-xs text-sky-500 font-medium">Drawing...</span>
                         </div>
                    ) : imageCache[option.imageId] ? (
                        <img 
                            src={imageCache[option.imageId]} 
                            alt={`${option.size} ${option.color} ${option.object}`}
                            className="w-full h-full object-cover rounded-xl pointer-events-none"
                        />
                    ) : (
                        <span className="text-xs text-slate-400">Image Error</span>
                    )}
                </button>
            ))}
        </div>

        {/* Reveal Answer (Only shown after correct selection) */}
        {showResult && (
                <div className="mt-8 p-6 bg-green-50 rounded-2xl border-2 border-green-200 text-center animate-fade-in-up">
                    <p className="text-xl md:text-2xl text-green-800 font-bold">
                        "{sentences[currentQuestionIndex].text}"
                    </p>
                </div>
            )}
        </div>
        
        {/* Progress Bar */}
        <div className="mt-8 w-full bg-sky-200 rounded-full h-4 overflow-hidden">
            <div 
                className="bg-sky-500 h-full transition-all duration-500 ease-out"
                style={{ width: `${((currentQuestionIndex) / sentences.length) * 100}%` }}
            ></div>
        </div>

      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in-up {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fade-in-up 0.5s ease-out forwards;
        }
      `}} />
    </div>
  );
}