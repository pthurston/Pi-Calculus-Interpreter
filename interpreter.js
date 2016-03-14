function PI_Interpreter(input){

	var data = {};
	var update_func, output_func, debug_func;

	this.loadInput = function(input){
		parser = new PI_Parser();
		program = parser.parse(input);
		//program['code'][0].collapse();
	}

	this.run = function(output, debug){
		output_func = output;
		debug_func = debug;
		console.log(program['code'][0]);
		update_func = setInterval(update, 100);
		//for(var i = 0; i < 10; i++)
		//	update();
	}

	function update(){
		//program['code'][0].collapse();
		var tree = program['code'][0];
		console.log(tree);
		if(tree == null || tree.children.length == 0){
			output_func("DONE");
			console.log(data);
			clearInterval(update_func);
			return;
		}
		execute(tree);
		tree.collapse();
	}		

	function execute(node){
		if(node == undefined)
			return;
		//console.log(node.data);
		current_node = node;
		if(node.data == "ROOT"){
			execute(node.children[0]);
		}else if(node.data == "PAR"){
			for(var i in node.children)
				execute(node.children[i]);		
		}else if(node.data == "SEQ"){
			execute(node.children[0]);
		}else if(node.data == "WRITE"){
			var channel = node.children[0].data;
			var dest = data[channel] == undefined ? channel : data[channel];
			var value = data[node.children[1].data];
			if(value == undefined)
				value = node.children[1].data;

			if(channel == 'print'){
				output_func("PRINT " + value);
			}else{
				data[dest] = value;
			}

			node.removeFromParent();
			debug_func("Write " + value + " to " + dest);	
		}else if(node.data == "READ"){
			var channel = node.children[0].data;
			if(data[channel] != undefined){
				debug_func("Read " + data[channel] + " from " + channel);
				
				node.removeFromParent();
				data[node.children[1].data] = data[channel];
				//delete data[channel];
			}
		}else if(node.data == "NEW"){
			debug_func("Create new channel " + node.children[0].data);
			node.removeFromParent();
		}else if(node.data == "PROCID"){
			var name = node.children[0].data;
			if(program['processes'][name] != undefined){
				node.replaceWith(program['processes'][name].copyTree());
				debug_func("Running " + name);
			}else{
				node.removeFromParent();
			}
		}
	}
}	