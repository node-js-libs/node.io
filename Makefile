test:
	@node_modules/expresso/bin/expresso -I lib --growl test/*.test.js

test-cov:
	@node_modules/expresso/bin/expresso -I lib --cov test/*.test.js

.PHONY: test test-cov
