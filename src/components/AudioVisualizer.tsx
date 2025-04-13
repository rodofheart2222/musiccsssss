import React, { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!analyser || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const waveformArray = new Uint8Array(analyser.fftSize);
    
    // Create particles
    const particles: Particle[] = [];
    const particleCount = 150; // Increased particle count
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.clientWidth,
        y: Math.random() * canvas.clientHeight,
        size: Math.random() * 5 + 1,
        speedX: Math.random() * 1 - 0.5,
        speedY: Math.random() * 1 - 0.5,
        color: `hsl(${Math.random() * 360}, 100%, 50%)`,
        opacity: Math.random() * 0.5 + 0.5,
        life: Math.random() * 100 + 50,
      });
    }
    
    let hue = 0;
    let frame = 0;
    
    // Create stars for background
    const stars: Star[] = [];
    const starCount = 100;
    
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * canvas.clientWidth,
        y: Math.random() * canvas.clientHeight,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.8 + 0.2,
        pulse: Math.random() * 0.1,
        pulseFactor: Math.random() * 0.1,
      });
    }
    
    const draw = () => {
      requestAnimationFrame(draw);
      frame++;
      
      analyser.getByteFrequencyData(dataArray);
      analyser.getByteTimeDomainData(waveformArray);
      
      // Calculate average frequency and bass level
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      const bassLevel = dataArray.slice(0, 10).reduce((sum, value) => sum + value, 0) / 10 / 255;
      
      // Clear canvas with fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; // Slower fade for trailing effect
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      
      // Draw stars in background
      stars.forEach((star, i) => {
        star.opacity = 0.2 + Math.sin(frame * star.pulse) * star.pulseFactor + (bassLevel * 0.3);
        star.size = 0.5 + Math.sin(frame * 0.02 + i) * 0.5 + (bassLevel * 2);
        
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.fill();
      });
      
      // Update hue
      hue = (hue + 0.5) % 360;
      
      // Draw center circle with glow
      const centerX = canvas.clientWidth / 2;
      const centerY = canvas.clientHeight / 2;
      const radius = average * 0.5 + (Math.sin(frame * 0.05) * 5);
      
      // Glow effect
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 2);
      gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.8)`);
      gradient.addColorStop(0.5, `hsla(${hue + 30}, 100%, 60%, 0.2)`);
      gradient.addColorStop(1, `hsla(${hue + 60}, 100%, 50%, 0)`);
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Draw center circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.fill();
      
      // Draw waveform with dynamic thickness
      ctx.beginPath();
      ctx.strokeStyle = `hsl(${hue + 120}, 100%, 50%)`;
      ctx.lineWidth = 2 + bassLevel * 3;
      
      const sliceWidth = canvas.clientWidth / waveformArray.length;
      let x = 0;
      
      for (let i = 0; i < waveformArray.length; i++) {
        const v = waveformArray[i] / 128.0;
        const y = (v * canvas.clientHeight) / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      ctx.stroke();
      
      // Draw frequency spectrum as a circular pattern
      if (frame % 2 === 0) { // Only draw every other frame for performance
        const centerX = canvas.clientWidth / 2;
        const centerY = canvas.clientHeight / 2;
        const radius = 100 + average * 0.3;
        
        ctx.beginPath();
        ctx.strokeStyle = `hsla(${hue + 180}, 100%, 50%, 0.5)`;
        ctx.lineWidth = 2;
        
        for (let i = 0; i < bufferLength; i += 4) {
          const amplitude = dataArray[i] / 255;
          const angle = (i / bufferLength) * Math.PI * 2;
          const radiusOffset = amplitude * 100;
          
          const x = centerX + Math.cos(angle) * (radius + radiusOffset);
          const y = centerY + Math.sin(angle) * (radius + radiusOffset);
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.closePath();
        ctx.stroke();
      }
      
      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        // Update position based on audio
        const frequencyIndex = Math.floor(i / particleCount * bufferLength);
        const frequencyValue = dataArray[frequencyIndex] / 255;
        
        p.size = frequencyValue * 15 + 1;
        p.opacity = frequencyValue * 0.8 + 0.2;
        
        // Move particles
        p.x += p.speedX * (frequencyValue * 5);
        p.y += p.speedY * (frequencyValue * 5);
        
        // Decrease life
        p.life -= 0.5;
        
        // Reset dead particles
        if (p.life <= 0) {
          p.life = Math.random() * 100 + 50;
          p.x = Math.random() * canvas.clientWidth;
          p.y = Math.random() * canvas.clientHeight;
          p.size = Math.random() * 5 + 1;
          p.opacity = Math.random() * 0.5 + 0.5;
        }
        
        // Wrap around edges
        if (p.x < 0) p.x = canvas.clientWidth;
        if (p.x > canvas.clientWidth) p.x = 0;
        if (p.y < 0) p.y = canvas.clientHeight;
        if (p.y > canvas.clientHeight) p.y = 0;
        
        // Draw particle with glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        
        // Particle gradient for glow effect
        const particleGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        particleGradient.addColorStop(0, `hsla(${(hue + i * 5) % 360}, 100%, 50%, ${p.opacity})`);
        particleGradient.addColorStop(1, `hsla(${(hue + i * 5) % 360}, 100%, 50%, 0)`);
        
        ctx.fillStyle = particleGradient;
        ctx.fill();
        
        // Connect particles
        if (frame % 3 === 0) { // Reduced frequency for better performance
          for (let j = i + 1; j < particles.length; j += 3) { // Skip some particles for performance
            const p2 = particles[j];
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 100) {
              ctx.beginPath();
              ctx.strokeStyle = `hsla(${(hue + i * 3) % 360}, 100%, 50%, ${(1 - distance / 100) * p.opacity * p2.opacity})`;
              ctx.lineWidth = 0.5;
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }
      }
      
      // Draw bass impact effect
      if (bassLevel > 0.7) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, bassLevel * 300, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${bassLevel - 0.7})`;
        ctx.lineWidth = 10 * bassLevel;
        ctx.stroke();
      }
    };
    
    draw();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [analyser]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="visualizer-canvas w-full h-full rounded-lg"
    />
  );
};

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
  opacity: number;
  life: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  pulse: number;
  pulseFactor: number;
}

export default AudioVisualizer;