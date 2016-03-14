function PI_Parser(){
	var lookahead;	//The next token to be parsed
	var line = 1; 	//The current line being parsed
	var col = 1;	//The current column being parsed
	var lexer;		//The input lexer object

	setRules();

	this.parse = function(input){
		console.log("Parse: ", input);
		lexer.setInput(input);
		lookahead = lexer.lex();
		var program = {
			processes: {},
			code: []
		}
		while(lookahead.id != "EOF" && lookahead != undefined){
			if(lookahead.id == "PROCID"){
				var name = procid();
				match("ASSIGNMENT");
				program['processes'][name] = par_statement();
			}else{
				var code = new Tree("ROOT");
				code.addChild(par_statement());
				program['code'].push(code);
			}

			if(lookahead.id == "NEWLINE")
					match("NEWLINE");
			//program['code'].push(par_statement());

		}
		return program;
	}

	function setRules(){
		lexer = new Lexer(function(char){
			alert("Unexpect token at line " + line + ", col " + col + ": " + char);
			throw new Error();
		});

		lexer.addRule(/[ \t]*/, function(lexeme){});
		lexer.addRule(/\n/, function(lexeme){
			col = 1;
			line++;
			return {id: 'NEWLINE', text: 'NEWLINE'};
		});
		lexer.addRule(/./, function(){
			this.reject = true;
			col++;
		});		

		var rules = [
			{rule: /\./, name: "SEQ"},
			{rule: /\|/, name:"PAR"},
			{rule: /=/, name: "ASSIGNMENT"},
			{rule: /\?/, name: "READ"},
			{rule: /!/, name: "WRITE"},
			{rule: /new/, name: "NEW"},
			{rule: /[()]/, name: "PAREN"},
			{rule: /[A-Z]+[A-Z_]*/, name: "PROCID"},
			{rule: /[a-z]+[a-z_]*/, name: "VARID"},
			{rule: /[1-9]+[0-9]*/, name: "NUM"},
			{rule: /$/, name: "EOF"}
		];

		for(var i = 0; i < rules.length; i++){
			lexer.addRule(rules[i].rule, new Function('lexeme',
				"return {id: '" + rules[i].name + "', text: lexeme};"));
		}
	}

	/*
	<ParStatement>	= <SeqStatement>
					| <SeqStatement>|<ParStatement>
	*/
	function par_statement(){
		console.log("Parse parallel statement");
		var child = seq_statement();
		
		if(lookahead.id != "PAR")
			return child;

		var code = new Tree("PAR", child);

		while(lookahead.id == "PAR"){
			match("PAR");
			code.addChild(par_statement());
		}

		return code;
	}

	/*
	<SeqStatement>	= <Expr>
					| <Expr> | <SeqStatement>
	*/
	function seq_statement(){
		var child = expression();

		if(lookahead.id != "SEQ")
			return child;

		var code = new Tree("SEQ", child);

		while(lookahead.id == "SEQ"){
			match("SEQ");
			code.addChild(seq_statement());
		}

		return code;
	}

	/*
	<Expr>	= <Variable>!<Variable>
			| <Variable>?<Variable>
			| new(<Variable>)
			| (<Process>)
			| <ProcessID>
	*/
	function expression(){
		if(lookahead.id == "VARID"){
			var channel = varid();
			if(lookahead.id == "READ"){
				match("READ");
				var message = varid();
				return new Tree("READ", new Tree(channel), new Tree(message));
			}else{
				match("WRITE");
				var message = varid();
				return new Tree("WRITE", new Tree(channel), new Tree(message));
			}
		}else if(lookahead.id == "PAREN"){
			match("PAREN");
			var proc = par_statement();
			match("PAREN");
			return proc;
		}else if(lookahead.id == "NEW"){
			match("NEW");
			match("PAREN");
			var name = varid();
			match("PAREN");
			return new Tree("NEW", new Tree(name));
		}else if(lookahead.id == "PROCID"){
			return new Tree("PROCID", new Tree(procid()));
		}
	}
	/*
	<Variable>	= <Identifier> | <Number>
	*/
	function varid(){
		if(lookahead.id == "VARID")
			return match("VARID");
		else
			return match("NUM");
	}

	function procid(){
		return match("PROCID");
	}

	function match(id){
		console.log(lookahead.id + ": " + lookahead.text);
		if(lookahead.id != id)
			alert("Syntax Error at ln: " + line + " col: " + col + ". Expected: " + id + ", found: " + lookahead.id);
		var value = lookahead.text;
		lookahead = lexer.lex();
		return value;
	}
}