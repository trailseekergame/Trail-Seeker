import React, { useState, useEffect, useRef } from 'react';
import { Text, TouchableWithoutFeedback, TextStyle } from 'react-native';

interface Props {
  text: string;
  speed?: number;
  onComplete?: () => void;
  style?: TextStyle;
}

export default function TypewriterText({ text, speed = 30, onComplete, style }: Props) {
  const [displayedCount, setDisplayedCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    setDisplayedCount(0);
    completedRef.current = false;

    intervalRef.current = setInterval(() => {
      setDisplayedCount(prev => {
        const next = prev + 1;
        if (next >= text.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (!completedRef.current) {
            completedRef.current = true;
            onComplete?.();
          }
          return text.length;
        }
        return next;
      });
    }, speed);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, speed]);

  const skipToEnd = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDisplayedCount(text.length);
    if (!completedRef.current) {
      completedRef.current = true;
      setTimeout(() => onComplete?.(), 0);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={skipToEnd}>
      <Text style={style}>
        {text.slice(0, displayedCount)}
        {displayedCount < text.length ? '\u258C' : ''}
      </Text>
    </TouchableWithoutFeedback>
  );
}
