"use strict";
var admin_address = "n1UXrtXNgJUa5EqS7mb6MoXPcHdcD3wEEXA";
var key = 'records';

var Record = function(text) {
    if (text) {
        var obj = JSON.parse(text);
        this.from = obj.from;
        this.exs = obj.exs;
        this.highprice = obj.highprice;
        this.lowprice = obj.lowprice;
        this.tel = obj.tel;
    } else {
        this.from = "";
        this.exs = [];
        this.highprice = 0;
        this.lowprice = 0;
        this.tel = "";
    }
}

Record.prototype = {
    toString: function() {
        return JSON.stringify(this);
    }
};

var Records = function(text) {
    if (text) {
        var obj = JSON.parse(text);
        this.records = obj.records;
    } else {
        this.records = [];
    }
}

Records.prototype = {
    toString: function() {
        return JSON.stringify(this);
    }
};



var NotifyContract = function() {
    LocalContractStorage.defineMapProperty(this, "repo", {
        parse: function(text) {
            return new Records(text);
        },
        stringify: function(o) {
            return o.toString();
        }
    });
};

NotifyContract.prototype = {
    init: function() {},

    save: function(exs, highprice, lowprice, tel) {
        var from = Blockchain.transaction.from;        
        var data = this.repo.get(key);

        if (!data){
            data = new Records();
        }


        for (var id in data.records){
            if (data.records[id]['from'] === from){
                if (tel.length != 11){
                    data.records.splice(id, 1);
                    this.repo.set(key, data);
                    return "success";
                }else{
                    data.records[id]['exs'] = exs;
                    data.records[id]['highprice'] = highprice;
                    data.records[id]['lowprice'] = lowprice;
                    data.records[id]['tel'] = tel;
                    this.repo.set(key, data);
                    return "success";
                }
            }
        }

        var record = new Record();
        record['from'] = from;
        record['exs'] = exs;
        record['highprice'] = highprice;
        record['lowprice'] = lowprice;
        record['tel'] = tel;

        data.records.push(record);
        this.repo.set(key, data);
        return "success";
    },

    query: function(address="", tel=""){
        var data = this.repo.get(key);

        for (var id in data.records){
            if (address && data.records[id]['from'] === address){
                return data.records[id];
            }
            if (tel && data.records[id]['tel'] === tel){
                return data.records[id];
            }
        }
        return ""; 
    },

    list: function(){
        var data = this.repo.get(key);
        if (data){
            return data.records;
        }
    },

    admin_withdraw: function(value) {
        var from = Blockchain.transaction.from;
        if (from !== admin_address) {
            throw new Error("您没有权限提现！");
        }
        var value = new BigNumber(value).times(10 ** 18);
        Blockchain.transfer(admin_address, value.toString());

        Event.Trigger("admin_withdraw", {
            Transfer: {
                from: "contract",
                to: from,
                value: value.toString()
            }
        });
        return "success";
    }
};

module.exports = NotifyContract;