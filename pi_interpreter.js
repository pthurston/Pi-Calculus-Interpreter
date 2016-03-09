function Pi_Interpreter(input, rules){
	var lookahead;
	var line = 1, col = 1;
	var lexer = new Lexer(function (char) {
		alert("Unexpected character at line " + line + ", col " + col + ": " + char)
	    throw new Error("Unexpected character at line " + line + ", col " + col + ": " + char);
	});

	lexer.addRule(/[ \t]*/, function(lexeme){});
	lexer.addRule(/\n/, function(lexeme){
		col = 1;
		line++;
	});
	lexer.addRule(/./, function(){
		this.reject = true;
		col++;
	});

	for(var i = 0; i < rules.length; i++){
		lexer.addRule(rules[i].p, new Function('lexeme',
			"return {id: '" + rules[i].name + "', text: lexeme};"));
	}

	lexer.setInput(input);

	var saved_procs = [];
	var channels = {};
	var output = "";

	this.run = function(){
		lookahead = lexer.lex();
		program();
		console.log(saved_procs);
		console.log(channels);
		return output;
	}

	function match(id){
		if(lookahead.id != id)
			console.log("Mismatch (" + line + ", " + col + "): " + lookahead.id + " != " + id);
		lookahead = lexer.lex();
	}

	/*
	<Program> 	= <Statement>\n<Program>
				| EOF
	*/
	function program(){

		while(lookahead.id != "EOF" && lookahead != undefined){
			statement();
			if(lookahead.id == "NEWLINE")
				match("NEWLINE");
		}
		match("EOF");
	}

	/*
	<Statement>	= <ProcessID>=<Process>
				| <Process>
	*/
	function statement(){
		if(lookahead.id == "PROCID"){
			var proc_name = procid();
			match("ASSIGNMENT");
			saved_procs[proc_name] = process();
		}else{
			var tree = process();
			var indent = '  ';
			for(var n = 0; n < 100 && tree.children.length > 0; n++){
				var nodes = [], writes = {};
				tree.traverseSyntaxTree(function(node){
					nodes.push(node);
				});
				for(var i = 0; i < nodes.length; i++){
					var parent = nodes[i].parent;
					if(nodes[i].data == 'NEW'){
						parent.removeChild(nodes[i]);
						parent.collapse();
						output += "CREATE CHANNEL " + nodes[i].children[0].data + "\n";
					}else if(nodes[i].data == 'WRITE'){
						writes[nodes[i].children[0].data] = nodes[i].children[1].data;
						output += "WRITE " + nodes[i].children[1].data + " to CHANNEL " + nodes[i].children[0].data + "\n";
						parent.removeChild(nodes[i]);
						parent.collapse();
						nodes.splice(i, 1);
						i--;
					}else if(nodes[i].data == "PROCID"){
						var index = nodes[i].parent.children.indexOf(nodes[i]);
						var parent = nodes[i].parent;
						var new_tree = saved_procs[nodes[i].children[0].data].copyTree();
						new_tree.parent = parent;
						parent.children[index] = new_tree;
					}
				}

				for(var i = 0; i < nodes.length; i++){
					var parent = nodes[i].parent;
					if(nodes[i].data == 'READ'){
						var sub_to = writes[nodes[i].children[0].data];
						if(sub_to != undefined){
							var sub_from = nodes[i].children[1].data;
							var parent = nodes[i].parent;
							parent.removeChild(nodes[i]);
							output += "READ " + sub_to + " from CHANNEL " + nodes[i].children[0].data + "\n";
							output += "BIND " + sub_from + " to " + sub_to + "\n";
							parent.applySub(sub_from, sub_to);
							parent.collapse();
						}
					}
				}

				//output += tree.printInOrder() + "\n";
				/*tree.traverseDF(function(msg, level){
					level = level == undefined ? 0 : level;
					console.log(indent.repeat(level), msg);
				});*/
			}
			console.log("Too many iterations");
			//execute(code);
			//eval(code);
		}
	}

	function read(msg, data){
		console.log(msg, data);
	}

	function execute(code){
		if(code['type'] == "PAR"){
			var completed = [];
			for(var i = 0; i < code['exprs'].length; i++)
				completed[i] = false;
			for(var i = 0; i < code['exprs'].length; i++){
				if(!completed[i])
					completed[i] = execute(code['exprs'][i]);
			}
		}else if(code['type'] == "SEQ"){
			for(var i = 0; i < code['exprs'].length; i++){
				var completed = execute(code['exprs'][i]);
				while(!completed)
					completed = execute(code['exprs'][i]);
			}
		}else if(code['type'] == "NEW"){
			channels[code['name']] = '';
			console.log("Create channel " + code['name']);
		}else if(code['type'] == "READ"){
			PubSub.subscribe(code['chan'], function(msg, data){
				console.log(msg, data);
			});
			/*if(channels[code['chan']] == '')
				return false;
			channels[code['name']] = channels[code['chan']];
			console.log("READ from " + code['chan'] + " to " + code['name']);*/
			return true;
		}else if(code['type'] == "WRITE"){

			channels[code['chan']] = code['name'];
			console.log("WRITE " + code['name'] + " to " + code['chan']);
			console.log(channels);
			return true;
		}
		return true;
	}

	/*
	<Process>	= <SeqExpr>|<Process>
				| <SeqExpr>
	*/
	function process(){
		var node = new Node('PAR');
		var child = seqExpr();

		if(lookahead.id == "PAR")
			node.addChild(child);
		else
			node = child;

		while(lookahead.id == "PAR"){
			match("PAR");
			node.addChild(seqExpr());
		}
		return node;
	}

	/*
	<SeqExpr>	= <Expr>.<Process>
				| <Expr>
	*/
	function seqExpr(){
		var node = new Node("SEQ");
		var child = expr();

		if(lookahead.id == "SEQ")
			node.addChild(child);
		else
			node = child;

		while(lookahead.id == "SEQ"){
			match("SEQ");
			node.addChild(expr());
		}
		return node;
	}

	/*
	<Expr>		= <Variable>!<Variable>
				| <Variable>?<Variable>
				| new(<Variable>)
				| (<Process>)
				| <ProcessID>
	*/
	function expr(){
		var node;
		if(lookahead.id == "VARID"){
			var channel = varid();
			if(lookahead.id == "READ"){
				match("READ");
				var variable = varid();
				node = new Node("READ");
				node.addChild(new Node(channel));
				node.addChild(new Node(variable));
			}else{
				match("WRITE");
				var variable = varid();
				node = new Node("WRITE");
				node.addChild(new Node(channel));
				node.addChild(new Node(variable));
			}
		}else if(lookahead.id == "NEW"){
			match("NEW");
			match("PAREN");
			var variable = varid();
			match("PAREN");
			node = new Node("NEW");
			node.addChild(new Node(variable));
		}else if(lookahead.id == "PAREN"){
			match("PAREN");
			node = process();
			match("PAREN");
		}else if(lookahead.id == "PROCID"){
			var proc_name = procid();
			node = new Node("PROCID");
			node.addChild(new Node(proc_name));
		}
		return node;
	}

	/*



	/*
	<ProcessID>	= [A-Z]+[A-Z_]* 
	*/
	function procid(){
		var procid = lookahead.text;
		match("PROCID");
		return procid;
	}


	/*
	<ProcessID>	= [A-Z]+[A-Z_]*
	*/
	function varid(){
		var varid = lookahead.text;
		match("VARID");
		return varid;

	}
}