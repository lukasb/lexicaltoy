import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect, useRef} from 'react';
import {$getRoot, $onUpdate, COMMAND_PRIORITY_CRITICAL, KEY_DOWN_COMMAND} from 'lexical';

type Props = {
  sampleSize?: number;
  onStats?: (stats: {
    p50: number;
    p90: number;
    p99: number;
    mean: number;
    count: number;
  }) => void;
};

class TypingBenchmark {
  private measurements: number[] = [];
  private sampleSize: number;

  constructor(sampleSize: number = 10) {
    this.measurements = [];
    this.sampleSize = sampleSize;
  }

  private percentile(sortedArr: number[], p: number): number {
    const index = Math.ceil((p / 100) * sortedArr.length) - 1;
    return sortedArr[index];
  }

  calculateStats() {
    const sorted = [...this.measurements].sort((a, b) => a - b);
    return {
      p50: this.percentile(sorted, 50),
      p90: this.percentile(sorted, 90),
      p99: this.percentile(sorted, 99),
      mean: this.measurements.reduce((a, b) => a + b, 0) / this.measurements.length,
      count: this.measurements.length
    };
  }

  addMeasurement(duration: number): void {
    this.measurements.push(duration);
  }

  shouldEmitStats(): boolean {
    return this.measurements.length % this.sampleSize === 0;
  }
}

export function TypingPerformancePlugin({
  sampleSize = 10,
  onStats
}: Props): null {
  const [editor] = useLexicalComposerContext();
  const benchmarkRef = useRef<TypingBenchmark | null>(null);

  useEffect(() => {

    if (!benchmarkRef.current) {
      benchmarkRef.current = new TypingBenchmark(sampleSize);
    }

    const benchmark = benchmarkRef.current;

    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      () => {
        const start = performance.now();
        const root = $getRoot().getWritable();
                
        $onUpdate(() => {
          const duration = performance.now() - start;
          benchmark.addMeasurement(duration);
          
          if (benchmark.shouldEmitStats()) {
            const stats = benchmark.calculateStats();
            
            if (onStats) {
              onStats(stats);
            } else {
              console.log(
                '%cPerformance Stats%c (%d samples)\n' +
                '%cp50:%c  %f ms\n' +
                '%cp90:%c  %f ms\n' +
                '%cp99:%c  %f ms\n' +
                '%cmean:%c %f ms',
                'color: #2ecc71; font-weight: bold; font-size: 1.1em;', '', stats.count,
                'color: #3498db; font-weight: bold', 'color: inherit', stats.p50,
                'color: #f1c40f; font-weight: bold', 'color: inherit', stats.p90,
                'color: #e74c3c; font-weight: bold', 'color: inherit', stats.p99,
                'color: #9b59b6; font-weight: bold', 'color: inherit', stats.mean
              );
            }
          }
        });

        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor, sampleSize, onStats]);

  return null;
}