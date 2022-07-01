// kernel:
//model.layers[0].getWeights()[0].print()

// bias:
//model.layers[0].getWeights()[1].print()


//save:
//aliveBirds[0].brain.model.save('downloads://my-model');
class NeuralNetwork {
	constructor(inputs, hiddenUnits, outputs, model = {}) {
		this.input_nodes = inputs;
		this.hidden_nodes = hiddenUnits;
		this.output_nodes = outputs;

		if (model instanceof tf.Sequential) {
			this.model = model;

		} else {
			this.model = this.createModel();
		}
	}
	serialize() {
		return JSON.stringify(this);
	  }
	
	  static deserialize(data) {
		if (typeof data == 'string') {
		  data = JSON.parse(data);
		}
		let nn = new NeuralNetwork(data.input_nodes, data.hidden_nodes, data.output_nodes);
		/* nn.weights_ih = Matrix.deserialize(data.weights_ih);
		nn.weights_ho = Matrix.deserialize(data.weights_ho);
		nn.bias_h = Matrix.deserialize(data.bias_h);
		nn.bias_o = Matrix.deserialize(data.bias_o);
		nn.learning_rate = data.learning_rate; */
		return nn;
	  }
	// Copy a model
	copy() {
		return tf.tidy(() => {
			const modelCopy = this.createModel();
			const weights = this.model.getWeights();
			const weightCopies = [];
			for (let i = 0; i < weights.length; i++) {
				weightCopies[i] = weights[i].clone();
			}
			modelCopy.setWeights(weightCopies);
			return new NeuralNetwork(this.input_nodes, this.hidden_nodes, this.output_nodes, modelCopy);
		});
	}

	mutate(rate) {
		tf.tidy(() => {
			const weights = this.model.getWeights();
			const mutatedWeights = [];
			for (let i = 0; i < weights.length; i++) {
				let tensor = weights[i];
				let shape = weights[i].shape;
				let values = tensor.dataSync().slice();
				for (let j = 0; j < values.length; j++) {
					if (Math.random(1) < rate) {
						let w = values[j];
						values[j] = w + randomGaussian();
					}
				}
				let newTensor = tf.tensor(values, shape);
				mutatedWeights[i] = newTensor;
			}
			this.model.setWeights(mutatedWeights);
		});
	}

	dispose() {
		this.model.dispose();
	}

	
	predict(inputs) {
		return tf.tidy(() => {
			const xs = tf.tensor2d([inputs]);
			const ys = this.model.predict(xs);
			const output = ys.dataSync();
			return output;
		});
	}

	createModel() {
		const model = tf.sequential();
		const hiddenLayer = tf.layers.dense({
			units: this.hidden_nodes,
			inputShape: [this.input_nodes],
			activation: "relu"
		});
		model.add(hiddenLayer);
		const outputLayer = tf.layers.dense({
			units: this.output_nodes,
			activation: "sigmoid"
		});
		model.add(outputLayer);
		
		return model;
	}

	
}
//funcion gaussiana
// function randomGaussian(){
// 	sd = 1
// 	let y1, x1, x2, w;
	
// 	  do {
// 		x1 = Math.random(2) - 1;
// 		x2 = Math.random(2) - 1;
// 		w = x1 * x1 + x2 * x2;
// 	  } while (w >= 1);
// 	  w = Math.sqrt(-2 * Math.log(w) / w);
// 	  y1 = x1 * w;
// 	  y2 = x2 * w;

// 	const m = 0;
// 	return y1 * sd + m;
// }