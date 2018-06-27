var dappAddress = 'n1vFCSpnzoVFqqYmYYfyDnZBUKAP27tQwZn';
var callbackUrl = 'https://mainnet.nebulas.io';
var mainnet_url = 'https://mainnet.nebulas.io/v1/user/call';

var address = "";

$(document).ready(function(){
    $("#ok_btn").click(function(){
        $("#alertDialog").fadeOut(200);
    });
});


var exs = [];

function get_ex(){
    var obj = $('input[name="checkbox_ex"]');
    var check_val = [];
    obj.each(function(i){
      if($(this).is(":checked")){            
          check_val.push($(this).val());
      }
  });
    return check_val;
}

function a(msg){
    $("#alert_content").html(msg);
    var $alertDialog = $('#alertDialog');
    $alertDialog.fadeIn(200);
}

var highprice;
var lowprice;
var tel;

function submit(){
    exs = get_ex();
    if (exs.length == 0){
        a("交易所至少选择一个!");
        return false;
    }
    highprice = parseFloat($("#highprice").val());
    lowprice =  parseFloat($("#lowprice").val());
    if (!lowprice || !lowprice || lowprice >= highprice){
        a("价格设置有误!");
        return false;
    }
    tel = $("#tel").val();
    if (tel && tel.length != 11){
        a("手机号码错误!");
        return false;
    }

    if ( tel )
        $('#submitDialog').fadeIn(200);
    else{
        $('#removeDialog').fadeIn(200);
    }
}


var leftsecs = 3*60*1000;

function pay(){

    var tmp = "";
    for (var ex in exs){
        tmp += exs[ex] + "|"
    }
    tmp = tmp.substr(0, tmp.length-1);
    
    if (tel)
        save(tmp, highprice, lowprice, tel)
    else
        remove()




    var $loadingToast = $('#loadingToast');
    if ($loadingToast.css('display') != 'none') return;

    $loadingToast.fadeIn(100);
    setTimeout(function () {
        $loadingToast.fadeOut(100);
    }, 10*60*1000);

    intervalQuery_daojishi = setInterval(function () {
            daojishi();
    }, 1000);

}


function daojishi(){
    leftsecs -= 1000;

    $("#daojishi").html(leftsecs/1000);
    if (leftsecs == 0){
        $("#showdaojishi").html("超时, 请刷新重试");
    }
}


var okex_price = 0;
var huobi_price = 0;

var usdt_cny = 0;

function fillprice(huobi_price){

    for (var i=1; i<6;i++){
        var t = parseInt(huobi_price) + i
        if ( t % 5 == 0){
            $("#highprice").val(t)
            break
        }
    }
    for (var i=1; i<6;i++){
        var t = parseInt(huobi_price) + -1*i;
        if ( t % 5 == 0){
            $("#lowprice").val(t)
            break
        }
    }
}

function initprice(){

    url = 'http://m.nas123.xyz/nasprice.json';
    $.get(url, function(data){
     if (data){
        usdt_cny = data['usdtrate'];

        okex_price = parseFloat(data['okex']['last'] * usdt_cny).toFixed(2);
        $("#okex_price").html(okex_price);
        huobi_price = parseFloat(data['huobipro']['last'] * usdt_cny).toFixed(2);
        $("#huobi_price").html(huobi_price)
        fillprice(huobi_price);
    }
});
}


initprice();

"use strict";
var intervalQuery;
var serialNumber;



var nebulas = require("nebulas"),
Account = nebulas.Account,
neb = new nebulas.Neb();
var NebPay = require("nebpay");
var nebPay = new NebPay();



function save(exs, highprice, lowprice, tel){

    var value = "0";
    var nonce = "0";
    var gas_price = "20000000";
    var gas_limit = "20000000";
    var callFunction = "save";

    var callArgs = JSON.stringify([exs, highprice, lowprice, tel]);
    console.log(callArgs);

    serialNumber = nebPay.call(dappAddress, value, callFunction, callArgs, {
        listener: cbSave, 
        callback: callbackUrl,

    });

    intervalQuery = setInterval(function () {
            funcIntervalQuery("", tel);
    }, 10000);
}


function remove(){

    var value = "0";
    var nonce = "0";
    var gas_price = "100000000";
    var gas_limit = "20000000";
    var callFunction = "save";

    var callArgs = JSON.stringify(["", "", "", ""]);
    console.log(callArgs);

    serialNumber = nebPay.call(dappAddress, value, callFunction, callArgs, {
        listener: cbSave, 
        callback: callbackUrl,

    });



}



function funcIntervalQuery(address="", tel=""){
    
    var params = '{"from":"' + dappAddress +'","to":"' +dappAddress+'","value":"0","nonce":"0","gasPrice":"1000000","gasLimit":"2000000","contract":{"function":"query","args":"[\\\"' + tel +'\\\"]"}}';
    console.log(params)
    $.post(mainnet_url, params, function(data){

        if (data['result']['result']){
            var record = JSON.parse(data['result']['result'])
            if (record){
                //clearInterval(intervalQuery);
                console.log("上链成功 " + record);
                $("#submitspan").html("上链成功, 现在你可以放心地关闭这个网页了");  
            }
        }
    });
}


function cbSave(resp){

}