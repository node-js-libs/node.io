test:
	@expresso -I lib --growl test/*.test.js

test-cov:
	@expresso -I lib --cov test/*.test.js

.PHONY: test test-cov