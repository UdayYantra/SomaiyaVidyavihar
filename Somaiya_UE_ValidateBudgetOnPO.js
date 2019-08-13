/*********************************************************
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * File Name: Somaiya_UE_ValidateBudgetAndPO_WA.js
 * Script Name: Somaiya_UE_ValidateBudgetAndPO_WA	
 * Company: Somaiya Vidya Vihar 
 * Date	Created:	
 * Date	Modified:	
 * Description:	
 **********************************************************/
define(['N/record', 'N/error', 'N/search', 'N/runtime'],

function(record, error, search, runtime) {

	function beforeSubmit(context) {
      	if (context.type === context.UserEventType.DELETE) {
        	return true;
        }
		var rec = context.newRecord;
		var recType = rec.type;
      	if(recType === 'purchaseorder') {
			var poRecStatus = rec.getValue({
			  fieldId: 'custbody_sv_approval_status_po'
			});
			if(poRecStatus != '2') {
				return true;
			}
		} else {
			var perRecStatus = rec.getValue({
			  fieldId: 'custbody_sv_approvalstatuspo'
			});
			if(perRecStatus != '2') {
				return true;
			}
		}
		var recId = rec.id;
		var recordObj = record.load({
              type: recType,
              id: recId,
              isDynamic: true,
		});
		var subsidiary = recordObj.getValue({
		  fieldId: 'subsidiary'
		});
		log.debug("subsidiary : ", subsidiary);
		
		var department = recordObj.getValue({
		  fieldId: 'department'
		});
		log.debug("department : ", department);

		var getclass = recordObj.getValue({
		  fieldId: 'class'
		});
		log.debug("getclass : ", getclass);

		var location = recordObj.getValue({
		  fieldId: 'location'
		});
		log.debug("location : ", location);

		var _total = recordObj.getValue({
		  fieldId: 'totalaftertaxes'
		});
		log.debug("total : ", _total);
		
		var _estimatedtotal = recordObj.getValue({
		  fieldId: 'estimatedtotal'
		});
		log.debug("_estimatedtotal : ", _estimatedtotal);
		
		var lineItemCount = recordObj.getLineCount({
		  sublistId: 'item'
		});
		log.debug("lineItemCount:- ", lineItemCount);
		if(recType === 'purchaseorder') {
			fetchItemsDetails(lineItemCount, recordObj, subsidiary, department, getclass, _total, recType); 
		} else {
			fetchItemsDetails(lineItemCount, recordObj, subsidiary, department, getclass, _estimatedtotal, recType); 
		}
		recordObj.save({
			enableSourcing: true,
			ignoreMandatoryFields: true
		});
	}
	
	function fetchItemsDetails(lineItemCount, recordObj, subsidiary, department, getclass, _total, recType) {
		var taxDetailsLineCount = recordObj.getLineCount({
			sublistId: 'taxdetails'
		});
		log.debug("taxDetailsLineCount", " count : "+ taxDetailsLineCount);
		var taxdetailsArray = new Array();
		var taxAmountArray = new Array();
		if(recType === 'purchaseorder') {
			for (var v = 0; v < taxDetailsLineCount; v++) 
			{
				var taxdetailsref = recordObj.getSublistValue({
					sublistId: "taxdetails",
					fieldId: "taxdetailsreference",
					line: v
				});
				log.debug('taxdetailsref', taxdetailsref);
				if(taxdetailsArray.indexOf(taxdetailsref) != -1) {
					var tax = recordObj.getSublistValue({
						sublistId: "taxdetails",
						fieldId: "taxamount",
						line: v
					});
					var existingtax = taxAmountArray[taxdetailsArray.indexOf(taxdetailsref)];
					log.debug("existingtax", " existingtax : "+ existingtax);
					existingtax+=tax;
					taxAmountArray[taxdetailsArray.indexOf(taxdetailsref)] = existingtax;
					log.debug("tax", " tax : "+ tax);
				} else {
					var tax = recordObj.getSublistValue({
						sublistId: "taxdetails",
						fieldId: "taxamount",
						line: v
					});
					log.debug('tax', tax);
					taxAmountArray.push(tax);
					taxdetailsArray.push(taxdetailsref);
				}				
			}
		}
		log.debug('taxdetailsArray length', taxdetailsArray.length);
		log.debug("taxdetailsArray", " taxdetailsArray : "+ taxdetailsArray);
		log.debug('taxAmountArray length', taxAmountArray.length);
		
		log.debug('taxAmountArray', taxAmountArray);
		var itemsArray = new Array();
		var accountArray = new Array();
		for (var i = 0; i < lineItemCount; i++) 
		{
			recordObj.selectLine({
				sublistId: 'item',
				line: i
			});
			var itemId = recordObj.getSublistValue({
				sublistId: "item",
				fieldId: "item",
				line: i
			});
			var itemTotal = 0;
			var taxamt = 0;
			
			log.debug("itemTotal", "**>>>>>>>>>>>>*********************<<<<<<<<<<<<<<< " + recType);
			if(recType === 'purchaseorder') 
			{
				itemTotal = recordObj.getSublistValue({
					sublistId: "item",
					fieldId: "amount",
					line: i
				});
				var taxdetailsreference = recordObj.getSublistValue({
					sublistId: "item",
					fieldId: "taxdetailsreference",
					line: i
				});
				log.debug('taxdetailsreference', taxdetailsreference);
				log.debug('taxdetailsArray.indexOf(taxdetailsreference)', taxdetailsArray.indexOf(taxdetailsreference));
				if(taxdetailsArray.indexOf(taxdetailsreference) != -1) {
					taxamt = taxAmountArray[taxdetailsArray.indexOf(taxdetailsreference)]; 
				}
			} else {
				itemTotal = recordObj.getSublistValue({
					sublistId: "item",
					fieldId: "estimatedamount",
					line: i
				});
			}
			var assetacc = recordObj.getSublistValue({
				sublistId: "item",
				fieldId: "custcol_sv_assetacc",
				line: i
			});
			
			var expenseaccount = recordObj.getSublistValue({
				sublistId: "item",
				fieldId: "custcol_sv_expenseaccount",
				line: i
			});
			
			department = recordObj.getSublistValue({
				sublistId: "item",
				fieldId: "department",
				line: i
			});
			
			getclass = recordObj.getSublistValue({
				sublistId: "item",
				fieldId: "class",
				line: i
			});
			
			var account = assetacc ? assetacc : expenseaccount;
			log.debug('Processing i value : ', i+" ******************************************* " + account);
			log.debug('Item Id:-', itemId);
			var utilizedCurrentBudget = 0;
			if(itemsArray.indexOf(itemId) != -1){
				for(var z = 0; z<itemsArray.length; z++) {
					if(itemsArray[z] == itemId) {
						var newItemTotal ='';
						if(recType === 'purchaseorder') {
							newItemTotal= recordObj.getSublistValue({
								sublistId: "item",
								fieldId: "amount",
								line: z
							});
							taxamt = taxAmountArray[z];
							newItemTotal+=taxamt;
						} else {
							newItemTotal= recordObj.getSublistValue({
								sublistId: "item",
								fieldId: "amount",
								line: z
							});
						}
						utilizedCurrentBudget += newItemTotal;
					}
				}
			} else if(accountArray.indexOf(account) != -1) {
				for(var z = 0; z<accountArray.length; z++) {
					if(accountArray[z] == account) {
						var newItemTotal ='';
						if(recType === 'purchaseorder') {
							newItemTotal = recordObj.getSublistValue({
								sublistId: "item",
								fieldId: "amount",
								line: z
							});
							taxamt = taxAmountArray[z];
							newItemTotal+=taxamt;
						} else {
							newItemTotal = recordObj.getSublistValue({
								sublistId: "item",
								fieldId: "amount",
								line: z
							});
						}
						utilizedCurrentBudget += newItemTotal;
					}
				}
			}
			itemsArray.push(itemId);
			accountArray.push(account);
			log.debug("itemTotal", "**>>>>>>>>>>>>*********************<<<<<<<<<<<<<<< " + itemTotal+"i===="+i);
			log.debug("taxamt", "**>>>>>>>>>>>>*********************<<<<<<<<<<<<<<< " + taxamt+"i===="+i);
			if(recType === 'purchaseorder') 
			{
				itemTotal+=taxamt;
			}
			setLineItemBudgetValues(itemId, subsidiary, department, getclass, _total, i, recordObj, itemTotal, utilizedCurrentBudget, assetacc, expenseaccount);
		}
		//log.debug("itemsArray", itemsArray);
	}
	
	function setLineItemBudgetValues(itemId, subsidiary , department, getclass, _total, i, recordObj, itemTotal, utilizedCurrentBudget, assetacc, expenseaccount){
		var recordId = recordObj.getValue({
		  fieldId: 'id'
		});
        //log.debug("recordId", "***********************" + recordId);
	  
		var utilizedPRBudget = fetchAllPRDetails(itemId, subsidiary , department, getclass, recordId, i, assetacc, expenseaccount);
		var utilizedPOBudget = fetchAllPODetails(itemId, subsidiary , department, getclass, utilizedPRBudget, recordId, i, assetacc, expenseaccount);
		log.debug("itemTotal", "*********************** " + itemTotal);
		log.debug("itemTotal", "utilizedPRBudget " + utilizedPRBudget + " utilizedPOBudget " + utilizedPOBudget + " utilizedCurrentBudget " + utilizedCurrentBudget);
		//var totalUtilizedBudget = Number(utilizedPRBudget) + Number(utilizedPOBudget) + Number(utilizedCurrentBudget);
		var totalUtilizedBudget = Number(utilizedPOBudget) + Number(utilizedCurrentBudget);
		log.debug("Final Values Begin", "***********************");
		
		var intitalUtilizedBudget = fetchIntitalUtilizedBudget(itemId, subsidiary , department, getclass, assetacc);
		log.debug("intitalUtilizedBudget" , intitalUtilizedBudget);
		totalUtilizedBudget += Number(intitalUtilizedBudget);

		log.debug("Utilized budge amt:", totalUtilizedBudget);
		var _actualBudgetAmount = fetchActualBudgetAmount(itemId, subsidiary , department, getclass, assetacc);
		log.debug("Actual budge amount:", _actualBudgetAmount);
		var _remainingBudgetAmount = Number(_actualBudgetAmount) - Number(totalUtilizedBudget);
		_remainingBudgetAmount = Number(_remainingBudgetAmount);
		log.debug("Remaining budge amount:", _remainingBudgetAmount);
		
		var _afterRemainingBudget = Number(_remainingBudgetAmount) - Number(itemTotal);
		log.debug("After Remaining budge amt:", _afterRemainingBudget);
		log.debug("Final Values End", "*************************");
		recordObj.selectLine({
          sublistId: 'item',
          line: i
        });
        //Actual Budget
        recordObj.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'custcol_sv_actual_budget',
          line: i,
          value: _actualBudgetAmount
        });

        //Utilized Budget
        recordObj.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'custcol_sv_budgetutilised',
          line: i,
          value: totalUtilizedBudget
        });

        //Remaining Budget
        recordObj.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'custcol_sv_remaining_budget',
          line: i,
          value: _remainingBudgetAmount
        });

        // After Remaining Budget
        recordObj.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'custcol_sv_afterremainingpof',
          line: i,
          value: _afterRemainingBudget
        });
		
		// intital utilized Budget
        recordObj.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'custcol_sv_used3mbudget',
          line: i,
          value: intitalUtilizedBudget
        });
		
		recordObj.commitLine({sublistId: 'item'});
	}
	
	function fetchIntitalUtilizedBudget(itemId, subsidiary , department, getclass, assetacc){
		var itemExpAcct = '';
		if(assetacc) {
			itemExpAcct = search.lookupFields({
				type: 'item',
				id: itemId,
				columns: 'assetaccount'
			});
		} else {
			itemExpAcct = search.lookupFields({
				type: 'item',
				id: itemId,
				columns: 'expenseaccount'
			});
		}
		log.debug('item Exp Acct:- ', itemExpAcct);
		
		var itemExpAccID = '';
      	if(assetacc) {
            itemExpAccID = itemExpAcct.assetaccount[0].value;
        } else {
          	itemExpAccID = itemExpAcct.expenseaccount[0].value;
        }
		log.debug('Expense Account ID:- ', itemExpAccID);
		var filterBudget = new Array();
		filterBudget.push(search.createFilter({
		  name : 'custrecord_sv_account',
		  operator : search.Operator.ANYOF,
		  values : itemExpAccID
		}));

		filterBudget.push(search.createFilter({
		  name : 'custrecord_sv_subsidiaryub',
		  operator : search.Operator.ANYOF,
		  values : subsidiary
		}));

		if(department) {
			filterBudget.push(search.createFilter({
			name : 'custrecord_sv_departmentub',
			operator : search.Operator.IS,
			values : department
		  })); 
		}
		
		if(getclass) {
			filterBudget.push(search.createFilter({
			  name : 'custrecord_sv_classub',
			  operator : search.Operator.IS,
			  values : getclass
			})); 
		}
		var columnBudget = new Array();

		columnBudget.push(search.createColumn({
		  name : 'custrecord_sv_usedbudget3m'
		}));
		
		
		
		var budgetimportSearchObj = search.create({
		  "type" : 'customrecord_sv_budgetutilised',
		  "filters" : filterBudget,
		  "columns" : columnBudget
		});

		var searchResultCount = budgetimportSearchObj.runPaged().count;
		log.debug("budgetimportSearchObj result count", searchResultCount);

		var budgetResult = budgetimportSearchObj.run().getRange({
		  start: 0,
		  end: searchResultCount
		});

		//Declared variable to store the value of actual budget.
		var _actualBudgetAmount = Number(0);
		if (budgetResult.length > 0 && budgetResult != '' && budgetResult != null) {

		  _actualBudgetAmount = budgetResult[0].getValue({
			name: 'custrecord_sv_usedbudget3m'
		  });
		  
		  log.debug("Actual budge amount:", _actualBudgetAmount);
		}
		return _actualBudgetAmount;
		
	}
	
	function identifyYear() {
		var yearRecId = '';
		var date = new Date();
		var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
		var period = months[date.getMonth()];
		period += " " +date.getFullYear();
		log.debug("period >>>>>>>>>>>> ",period);
		var accountingperiodSearchObj = search.create({
		   type: "accountingperiod",
		   filters:
		   [
			  ["periodname","contains", period]
		   ],
		   columns:
		   [
			  search.createColumn({name: "parent", label: "Parent"})
		   ]
		});
		var searchResultCount = accountingperiodSearchObj.runPaged().count;
		
		log.debug("accountingperiodSearchObj result count",searchResultCount);
		accountingperiodSearchObj.run().each(function(result){
			var parentId = result.getValue({
				name: 'parent'
			});
			log.debug('parent', parentId);
			var accountingperiodParent = record.load({
				type: "accountingperiod",
				id: parentId,
				isDynamic: true,
			});
            var yearId = accountingperiodParent.getValue({
           	 	fieldId: 'parent'
          	});
			yearRecId = yearId;
			log.debug('yearId', yearId);
		   return true;
		});
		return yearRecId;
	}
	
	function fetchActualBudgetAmount(itemId, subsidiary , department, getclass, assetacc) {
		var itemExpAcct = '';
		if(assetacc) {
			itemExpAcct = search.lookupFields({
				type: 'item',
				id: itemId,
				columns: 'assetaccount'
			});
		} else {
			itemExpAcct = search.lookupFields({
				type: 'item',
				id: itemId,
				columns: 'expenseaccount'
			});
		}
		log.debug('item Exp Acct:- ', itemExpAcct);
		
		var itemExpAccID = '';
      	if(assetacc) {
            itemExpAccID = itemExpAcct.assetaccount[0].value;
        } else {
          	itemExpAccID = itemExpAcct.expenseaccount[0].value;
        }
		log.debug('Expense Account ID:- ', itemExpAccID);
		
		var yearRecordId = identifyYear();
		
		var filterBudget = new Array();

		filterBudget.push(search.createFilter({
		  name : 'account',
		  operator : search.Operator.ANYOF,
		  values : itemExpAccID
		}));

		filterBudget.push(search.createFilter({
		  name : 'subsidiary',
		  operator : search.Operator.ANYOF,
		  values : subsidiary
		}));

		if(department) {
			filterBudget.push(search.createFilter({
			name : 'department',
			operator : search.Operator.IS,
			values : department
		  })); 
		}
		
		if(getclass) {
			filterBudget.push(search.createFilter({
			  name : 'class',
			  operator : search.Operator.IS,
			  values : getclass
			})); 
		}
		filterBudget.push(search.createFilter({
			name : 'year',
			operator : search.Operator.IS,
			values : yearRecordId
		})); 
		var columnBudget = new Array();

		columnBudget.push(search.createColumn({
		  name: "account",
		  sort: search.Sort.ASC,
		  label: "Account"
		}));

		columnBudget.push(search.createColumn({
		  name : 'department'
		}));

		columnBudget.push(search.createColumn({
		  name : 'subsidiary'
		}));

		columnBudget.push(search.createColumn({
		  name : 'location'
		}));

		columnBudget.push(search.createColumn({
		  name : 'amount'
		}));
		
		columnBudget.push(search.createColumn({
		  name : 'internalid'
		}));
		
		var budgetimportSearchObj = search.create({
		  "type" : 'budgetimport',
		  "filters" : filterBudget,
		  "columns" : columnBudget
		});

		var searchResultCount = budgetimportSearchObj.runPaged().count;
		log.debug("budgetimportSearchObj result count", searchResultCount);

		var budgetResult = budgetimportSearchObj.run().getRange({
		  start: 0,
		  end: searchResultCount
		});

		//Declared variable to store the value of actual budget.
		var _actualBudgetAmount = Number(0);
		if (budgetResult.length > 0 && budgetResult != '' && budgetResult != null) {

		  _actualBudgetAmount = budgetResult[0].getValue({
			name: 'amount'
		  });
		  
		  log.debug("Actual budge amount:", _actualBudgetAmount);
		}
		return _actualBudgetAmount;
	}
	
	function fetchAllPODetails(itemId, subsidiary , department, getclass, _utilizedBudgetAmount, recordId, z, assetacc, expenseaccount) {
		var filterTransaction = new Array();
    
		filterTransaction.push(search.createFilter({
			name : 'subsidiary',
			operator : search.Operator.ANYOF,
			values : subsidiary
		}));

		if(department) {
		    filterTransaction.push(search.createFilter({
				name : 'department',
				operator : search.Operator.IS,
				values : department
			})); 
		}
		  
		if(getclass) {
			filterTransaction.push(search.createFilter({
				name : 'class',
				operator : search.Operator.IS,
				values : getclass
			}));
		}
		
		filterTransaction.push(search.createFilter({
		  name : 'type',
		  operator : search.Operator.ANYOF,
		  values : "PurchOrd"
		}));
		
		filterTransaction.push(search.createFilter({
			name : 'mainline',
			operator : search.Operator.IS,
			values : 'F'
		}));
		if(assetacc) {
			filterTransaction.push(search.createFilter({
				name : 'custcol_sv_assetacc',
				operator : search.Operator.ANYOF,
				values : assetacc
			}));
		}
		log.debug('expenseaccount','expenseaccount' + expenseaccount);
		if(expenseaccount) {
			filterTransaction.push(search.createFilter({
				name : 'custcol_sv_expenseaccount',
				operator : search.Operator.ANYOF,
				values : expenseaccount
			}));
		}
		filterTransaction.push(search.createFilter({
			name : 'approvalstatus',
			operator : search.Operator.NONEOF,
			values : '3'
		}));
		
		var columnTransaction = new Array();

		columnTransaction.push(search.createColumn({
		  name: "type",
		  label: "Type"
		}));
		
		columnTransaction.push(search.createColumn({
			name: "internalid",
			label: "Id"
		}));
		
		columnTransaction.push(search.createColumn({
			name: "totalaftertaxes",
			label: "Total Amount"
		}));
		
		var transactionimportSearchObj = search.create({
			type: "transaction",
			filters: filterTransaction,
			columns: columnTransaction
		});
		
		var searchResultCount = transactionimportSearchObj.runPaged().count;
		log.debug("searchResultCount result count", searchResultCount);

		var transactionResult = transactionimportSearchObj.run().getRange({
		  start: 0,
		  end: searchResultCount
		});
		
		if(transactionResult) {
			var poArray = new Array();
			for(var a = 0; a < transactionResult.length; a++) {
				
				
				var type = transactionResult[a].getValue({
				  name: 'type'
				});
				amountToBeAdded = Number(0);
				//TODO: logic to be rewritten for fetching the amount based on the line item amount of the PO
				
				var totalAmount = transactionResult[a].getValue({
					name: 'amount'
				});
				log.debug("totalAmount", totalAmount);

				var purchOrdId = transactionResult[a].getValue({
					name: 'internalid'
				});
				if(poArray.indexOf(purchOrdId) != -1) {
					continue;
				}
				poArray.push(purchOrdId);
				log.debug("purchOrdId", purchOrdId);
				var purOrdRecord = record.load({
					  type: "purchaseorder",
					  id: purchOrdId,
					  isDynamic: true,
				});
				var lineItemCount = purOrdRecord.getLineCount({
					  sublistId: 'item'
				});
				var isCurrentPO = false;
				if(recordId == purchOrdId) {
					log.debug("calculating for current po " , recordId);
					isCurrentPO = true;
				}
				var amountTotalAdded = Number(0);
				var account = assetacc ? assetacc : expenseaccount;
				for (var i = 0; i < lineItemCount; i++) {
					var purchOrditemId = purOrdRecord.getSublistValue({
						sublistId: "item",
						fieldId: "item",
						line: i
					});
					log.debug('Item Id:-', purchOrditemId);
					var lineassetacc = purOrdRecord.getSublistValue({
						sublistId: "item",
						fieldId: "custcol_sv_assetacc",
						line: i
					});
					
					var lineexpenseaccount = purOrdRecord.getSublistValue({
						sublistId: "item",
						fieldId: "custcol_sv_expenseaccount",
						line: i
					});
					var currentLineAccount = lineassetacc ? lineassetacc : lineexpenseaccount;
					if(purchOrditemId == itemId) {
						var amount = purOrdRecord.getSublistValue({
							sublistId: "item",
							fieldId: "amount",
							line: i
						});
						log.debug('amount:-', amount);
						if(isCurrentPO) {
							log.debug('current po');
							if(z <= i) {
								log.debug('>>>>>>>>>>>>>>>>>>>><<<<<<<<<<<<<<<<<<<<<', 'if');
							}
						} else {
							amountTotalAdded = amount;
						}
						amountToBeAdded += Number(amountTotalAdded);
					} else if (currentLineAccount == account) {
						var amount = purOrdRecord.getSublistValue({
							sublistId: "item",
							fieldId: "amount",
							line: i
						});
						log.debug('amount:-', amount);
						if(isCurrentPO) {
							log.debug('current po');
							if(z <= i) {
								log.debug('>>>>>>>>>>>>>>>>>>>><<<<<<<<<<<<<<<<<<<<<', 'if');
							}
						} else {
							amountTotalAdded = amount;
						}
						amountToBeAdded += Number(amountTotalAdded);
					}
					
				}
				
				_utilizedBudgetAmount = Number(_utilizedBudgetAmount) + Number(amountToBeAdded);
				log.debug("fetchAllPODetails _utilizedBudgetAmount", _utilizedBudgetAmount);
			}
		}
		return _utilizedBudgetAmount;
	}
	function fetchAllPRDetails(itemId, subsidiary , department, getclass, recordId, z, assetacc, expenseaccount) {
	
		var filterTransaction = new Array();
		filterTransaction.push(search.createFilter({
			name : 'subsidiary',
			operator : search.Operator.ANYOF,
			values : subsidiary
		}));
		if(department) {
			filterTransaction.push(search.createFilter({
				name : 'department',
			    operator : search.Operator.IS,
			    values : department
			})); 
		}
		if(getclass) {
			filterTransaction.push(search.createFilter({
				name : 'class',
				operator : search.Operator.IS,
				values : getclass
			}));
        }
		if(assetacc) {
			filterTransaction.push(search.createFilter({
				name : 'custcol_sv_assetacc',
				operator : search.Operator.ANYOF,
				values : assetacc
			}));
		}
		log.debug('expenseaccount','expenseaccount' + expenseaccount);
		if(expenseaccount) {
			filterTransaction.push(search.createFilter({
				name : 'custcol_sv_expenseaccount',
				operator : search.Operator.ANYOF,
				values : expenseaccount
			}));
		}
		filterTransaction.push(search.createFilter({
		  name : 'type',
		  operator : search.Operator.ANYOF,
		  values : "PurchReq"
		}));
		filterTransaction.push(search.createFilter({
			name : 'mainline',
			operator : search.Operator.IS,
			values : 'F'
		}));
		filterTransaction.push(search.createFilter({
			name : 'item',
			operator : search.Operator.ANYOF,
			values : itemId
		}));
		filterTransaction.push(search.createFilter({
			name : 'approvalstatus',
			operator : search.Operator.NONEOF,
			values : '3'
		}));
		
		var columnTransaction = new Array();

		columnTransaction.push(search.createColumn({
		  name: "type",
		  label: "Type"
		}));
		
		columnTransaction.push(search.createColumn({
			name: "estimatedtotal",
			label: "Estimated Amount"
		}));
		
		columnTransaction.push(search.createColumn({
			name: "total",
			label: "Total Amount"
		}));
		
		columnTransaction.push(search.createColumn({
			name: "internalid",
			label: "Id"
		}));
		
		var transactionimportSearchObj = search.create({
		  type: "transaction",
		  filters: filterTransaction,
		  columns: columnTransaction
		});

		var searchResultCount = transactionimportSearchObj.runPaged().count;
		log.debug("searchResultCount result count", searchResultCount);

		var transactionResult = transactionimportSearchObj.run().getRange({
		  start: 0,
		  end: searchResultCount
		});
		
		var _utilizedBudgetAmount = Number(0);
		var amountToBeAdded = Number(0);
		
		if(transactionResult) {
			for(var a = 0; a < transactionResult.length; a++) {
				var type = transactionResult[a].getValue({
				  name: 'type'
				});
				
				var prid = transactionResult[a].getValue({
				  name: 'internalid'
				});
				var isCurrentPO = false;
				if(recordId == prid) {
					log.debug("calculating for current po " , recordId);
					isCurrentPO = true;
				}
				
				var linkCount = 0;
				if(prid) {
					var pr = record.load({
					  type: "purchaserequisition",
					  id: prid,
					  isDynamic: true,
				  });
					linkCount = pr.getLineCount({
						sublistId: 'links'
					});
					log.debug("linkCount:- ", linkCount);
				}
				amountToBeAdded = Number(0);
				var estimatedTotalAmount = transactionResult[a].getValue({
					name: 'estimatedtotal'
				  });
				  
				log.debug("estimatedTotalAmount", estimatedTotalAmount);
				var split = estimatedTotalAmount;
				
				if(estimatedTotalAmount.indexOf("-") >= 0) {
					split = estimatedTotalAmount.split("-");
					estimatedTotalAmount = split[1];
				}
				
				log.debug("estimatedTotalAmount", estimatedTotalAmount);
				if(linkCount == 0) {
					log.debug("inside if ", "count 0");
					if(isCurrentPO) {
						log.debug('current po');
						if(z <= i) {
							log.debug('>>>>>>>>>>>>>>>>>>>><<<<<<<<<<<<<<<<<<<<<', 'if');
						}
					} else {
						amountToBeAdded = Number(estimatedTotalAmount);
					}
				} else {
					log.debug("inside else ", "linkCount " + linkCount);
				}
				_utilizedBudgetAmount = Number(_utilizedBudgetAmount) + Number(amountToBeAdded);
				log.debug("fetchAllPRDetails _utilizedBudgetAmount", _utilizedBudgetAmount);
			}
		}
		return _utilizedBudgetAmount;
	}
	return {
		afterSubmit: beforeSubmit
	}
});