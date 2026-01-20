import { useState, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

export const useFFmpeg = () => {
    const [loaded, setLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const ffmpegRef = useRef(new FFmpeg());

    const load = async () => {
        setIsLoading(true);
        const ffmpeg = ffmpegRef.current;

        ffmpeg.on('log', ({ message }) => {
            setMessage(message);
            console.log(message);
        });

        try {
            const baseURL = new URL('./', document.location.href).href;
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}ffmpeg-core.wasm`, 'application/wasm'),
            });
            setLoaded(true);
        } catch (error) {
            console.error('Failed to load FFmpeg:', error);
            setMessage('Failed to load FFmpeg. Check console for details.');
        } finally {
            setIsLoading(false);
        }
    };

    return { ffmpeg: ffmpegRef.current, loaded, load, isLoading, message };
};
