import { useEffect, useRef } from 'react';

/**
 * Custom hook to auto-scroll to the bottom of a container when its content changes
 * @param {Array} deps - Array of dependencies that will trigger the scroll when changed
 * @returns {React.RefObject} ref - Reference to attach to the scrollable container
 */
const useAutoScroll = (deps = []) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      const { scrollHeight, clientHeight } = scrollRef.current;
      scrollRef.current.scrollTop = scrollHeight - clientHeight;
    }
  }, deps);

  return scrollRef;
};

export default useAutoScroll; 