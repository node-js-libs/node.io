test:
	@expresso -I lib --growl $(TEST_FLAGS) test/*.test.js

test-cov:
	@expresso -I lib --cov $(TEST_FLAGS) test/*.test.js

.PHONY: test test-cov