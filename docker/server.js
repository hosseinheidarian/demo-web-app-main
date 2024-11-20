const express = require('express');
const redis = require('redis');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const redisClient = redis.createClient({
  host: 'my-redis-master',
  port: 6379,
  password: process.env.REDIS_PASSWORD,
});

app.use(express.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'static')));
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'views', 'add-key.html'));
});

app.post('/addkey', function(req, res) {
  console.log(req.body)
  const content = fs.readFileSync('./views/add-value.html', 'utf8');
  redisClient.set(req.body.key, req.body.value);
  res.send(content.replace("DATA", req.body.key));
});

app.get('/viewdb', function(req, res) {
  console.log(req.body);
  redisClient.info(function(err, result) {
    function filterItems(line) {
      labels = [
        'redis_version', 
        'used_memory', 
        'total_system_memory',
        'total_system_memory_human',
        'instantaneous_ops_per_sec',
        'connected_slaves',
        'master_repl_offset',
        'repl_backlog_size',
        'db0'
      ]
      for (let i = 0; i < labels.length; i++){
        if (line.split(":")[0] === labels[i]) {
          return line;
        } else if (line.startsWith('slave')) {
          return line;
        }
      }
    }
    if (err) console.log(err);
    console.log(result);
    try {
      items = result.split('\r\n');
      items = items.filter(filterItems);
      console.log(items);
      items_dict = items.reduce((accu, part) => {
        const [k, v] = part.split(":", 2);
        accu[k] = v;
        return accu; 
      }, {});
      console.log(items_dict);
      const content = fs.readFileSync('./views/view-db.html', 'utf8');
      data_string = `<tr><td>Redis version</td><td>${items_dict.redis_version}</td></tr>
      <tr><td>Memory used</td><td>${(Number(items_dict.used_memory)/Number(items_dict.total_system_memory)*100).toFixed(2)}%</td></tr>
      <tr><td>Total Memory</td><td>${items_dict.total_system_memory_human}</td></tr>
      <tr><td>Operations per second</td><td>${items_dict.instantaneous_ops_per_sec}</td></tr>
      <tr><td>Number of replication targets</td><td>${items_dict.connected_slaves}</td></tr>
      `;
      if (Number(items_dict.connected_slaves) > 0) {
        data_string += `<tr><td>Master replication offset</td><td>${items_dict.master_repl_offset}</td></tr>
        `;
        for (let i = 0; i < Number(items_dict.connected_slaves); i++) {
          const target = `slave${i}`;
          data_string += `<tr><td>Target ${i} offset</td><td>${items_dict[target].split(",")[3].split("=")[1]}</td></tr>
          `;
        }
        data_string += `<tr><td>Replication backlog size</td><td>${(Number(items_dict.repl_backlog_size)/1000000).toFixed(2)}M</td></tr>
        `;
      }
      data_string += `<tr><td>Total number of keys</td><td>${items_dict.db0.split(",")[0].split("=")[1]}</td></tr>`;
      res.send(content.replace("DATA", data_string));
    } catch (err) {
      console.log(err);
    }
  });
});

app.get('/viewtests', function(req, res) {
  const content = fs.readFileSync('./views/view-tests.html', 'utf8');
  if (fs.existsSync('/clientdata/benchmark/results.txt')) {
    console.log('Found test results. Loading..');
    const test_results = fs.readFileSync('/clientdata/benchmark/results.txt', 'utf8');
    console.log(test_results);
    results = test_results.split('\r');
    console.log(results);
    res_dict = results.reduce((accu, part) => {
      const k = part.substring(0, part.indexOf(':'));
      const v = part.substring(part.indexOf(':')+1);
      accu[k] = v.trim();
      return accu; 
    }, {});
    console.log(res_dict);
    var data_string = ``;
    for (const [k, v] of Object.entries(res_dict)) {
      data_string += `<tr><td>${k}</td><td>${v}</td></tr>
      `;
    }
    res.send(content.replace("DATA", data_string));
  } else {
    console.log("Test results not located.")
    res.send(content.replace("DATA", "Test results not yet available."));
  }
});

app.listen(5000, function() {
    console.log('Web application is listening on port 5000');
});
