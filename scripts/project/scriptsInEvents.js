


const scriptsInEvents = {

	async Events_Event13_Act1(runtime, localVars)
	{
		/* The eval function takes a string and read it as code using the JS interpreter. Be very careful using such technique in production, as code can be injected. This template mitigates this problem by using an on-screen keyboard with very limited possibilities. In a real scenario, the best course of action would be to use a library that provides a dedicated mathematical-only evaluator or, considering a more general case, to create a parser. */
		
		// Try to evaluate the mathematical expression. If there is an error, return 0.
		try {
			runtime.setReturnValue(eval(localVars.expr));
		} catch (error) {
			runtime.setReturnValue(0);
		}
		
	}

};

self.C3.ScriptsInEvents = scriptsInEvents;

