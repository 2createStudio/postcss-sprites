import test from 'ava';
import plugin from '../lib';

test('should throw error when `retina` & `responsive` are enabled at same time', (t) => {
	t.throws(() => {
		plugin({
			retina: true,
			responsive: true
		})();
	}, `postcss-sprites: Can't use 'retina' & 'responsive' at same time.`);
});
