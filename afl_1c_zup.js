//Функция обработки Физ лица полученого из 1C ZUP
function ToPushError(sErrorText, oObject) {
    oObject.error = 1;
    oObject.errors.push(sErrorText);
    AlertLog(sErrorText);
    return oObject;
}

function PushError(sText, oRes, sFunction, sLib) {
	if (IsEmptyValue(sLib)) sLib = "libAfl1CZup"
	oRes = tools.call_code_library_method('libAflMain', 'PushError', [sText, oRes, sFunction, sLib])
	return oRes
}

function AlertLog(sLog, sLogName) {
    if (sLogName == undefined) sLogName = "Lib_Integration_1C_LOG"
    tools.call_code_library_method("libAflMain", "AlertLog", [sLog, sLogName]);
    return true
}

function HandleCollaborator(tePacketContent)
{
	var oRes = tools.get_code_library_result_object();
	oRes.error = 0;
	oRes.errors = [];
	oRes.result = '';
	sLib = "libAfl1C"
	sFunction = "HandleCollaborator"
	try {
		teBody = tePacketContent.Body
		oPacketCollaborator = teBody.OptChild('Directory.Collaborator')
		if(oPacketCollaborator!=undefined)
		{
			if(!IsEmptyValue(oPacketCollaborator.KeyProperties.Link))
			{
				oCollaborator = ArrayOptFirstElem(XQuery("for $elem in collaborators where code = '"+oPacketCollaborator.KeyProperties.Link+"' return $elem"))
				if(oCollaborator==undefined)
				{
					docCollaborator = OpenNewDoc("x-local://wtv/wtv_collaborator.xmd")
					docCollaborator.BindToDb()
					docCollaborator.TopElem.code = String(oPacketCollaborator.KeyProperties.Link.Value)
				}
				else
				{
					docCollaborator = tools.open_doc(oCollaborator.id)
				}
				if(docCollaborator!=undefined)
				{
					teCollaborator = docCollaborator.TopElem
	
					teCollaborator.firstname = String(oPacketCollaborator.Firstname)
					teCollaborator.lastname = String(oPacketCollaborator.Lastname)
					teCollaborator.middlename = String(oPacketCollaborator.Middlename)
					if(oPacketCollaborator.Gender == 'Мужской')
					{
						teCollaborator.sex = 'm'
					}
					else if(oPacketCollaborator.Gender == 'Женский')
					{
						teCollaborator.sex = 'w'
					}
					if(OptDate(oPacketCollaborator.BirthDay)!=undefined)
					{
						teCollaborator.birth_date = OptDate(oPacketCollaborator.BirthDay)
					}
					teCollaborator.custom_elems.ObtainChildByKey('IsGetFromCashRegister').value = tools_web.is_true(oPacketCollaborator.IsGetFromCashRegister)
					
					//TODO Добавить заполнение контактной информации
					//TODO Добавление Руководителя в карточку сотрудника
					
					docCollaborator.Save()
				}
			}
			else
			{
				oRes = PushError("Не удалось получить ключевое поле объекта. Был передан некорректный Xml", oRes, sFunction, sLib)
			}
		}
	}
	catch (e) {
		oRes = PushError(e, oRes, sFunction, sLib)
	}
	oRes.errorText = oRes.errors.join("\n")
	return oRes;
}
//Функция обработки Расчётного листка полученого из 1C ZUP
function HandleExchangeMessage(tePacketContent)
{
	var oRes = tools.get_code_library_result_object();
	oRes.error = 0;
	oRes.errors = [];
	oRes.result = '';
	sLib = "libAfl1C"
	sFunction = "HandleExchangeMessage"
	try {
		teBody = tePacketContent.Body
		oPacket = teBody.ExchangeMessage
		if(oPacket!=undefined)
		{
			switch(oPacket.MessageType)
			{
				case 'Рассылка расчетных листков':
					oRes = HandlePayslips(teBody)
					break;
			}
		}
	}
	catch (e) {
		oRes = PushError(e, oRes, sFunction, sLib)
	}
	oRes.errorText = oRes.errors.join("\n")
	return oRes;
}
function HandlePayslips(teBody)
{
	var oRes = tools.get_code_library_result_object();
	oRes.error = 0;
	oRes.errors = [];
	oRes.result = "";
	sLib = "libAfl1C";
	sFunction = "HandlePayslips";
	sDataObjectTypeCode = "afl_payslips"; // код типа ланных объекта "Расчётные листки"
	try {

		oPacket = teBody.OptChild("ExchangeMessage");
		if (oPacket != undefined) {
			if(!IsEmptyValue(oPacket.KeyProperties.Link)) {
				/* Находим сотрудника по табельному коду (поле code карточки collaborator) */
				sPersonCode = oPacket.OptChild("Positions").OptChild("Line").OptChild("Position").OptChild("PersonalNumber");
				if (sPersonCode == undefined) {
					sPersonCode = "";
				}
				iPersonID = null;
				oPersinID = ArrayOptFirstElem(XQuery("for $elem in collaborators where $elem/code = "+ XQueryLiteral(sPersonCode) +" return $elem"));
				if (oPersinID != undefined) {
					iPersonID = OptInt(oPersinID.id, null);
				}
				iPaySlipID = 0; // переменная для объекта Расчётный лист (существующий или созланный)
				/* Находим тип данных объекта по указанному коду */
				oObjectDataType = ArrayOptFirstElem(XQuery("for $elem in object_data_types where $elem/code = "+ XQueryLiteral(sDataObjectTypeCode) +" return $elem"));
				if (oObjectDataType != undefined) {
					/* Получаем данные о расчётном листе из поля Значение */
					oPackageData = oPacket.OptChild("Positions").OptChild("Line").OptChild("AdditionalData").OptChild("Line").OptChild("Value");
					if (oPackageData != undefined) {
						oPackageData = ParseJson(oPackageData);
						/* Определяем, есть ли в системе расчётный листок с кодом из поля КлючевыеСвойства */
						oPaySlip = ArrayOptFirstElem(XQuery("for $elem in object_datas where $elem/object_data_type_id = "+ OptInt(oObjectDataType.id) +" and $elem/code = "+ XQueryLiteral(oPacket.KeyProperties.Link) +" return $elem"));
						
						if (oPaySlip != undefined) {
							iPaySlipID = oPaySlip.id;
							/* Редактируем найденный объект (полная перезапись всех полей, кроме кода) */
							docPaySlip = tools.open_doc(oPaySlip.id);
							if (docPaySlip != undefined) {
								docPaySlip.TopElem.name = oPackageData.GetOptProperty("МесяцНачисления", "");
								docPaySlip.TopElem.data_str = EncodeJson(oPackageData.GetOptProperty("ДанныеРасчетныхЛистков"));
								docPaySlip.TopElem.start_date = OptDate(oPackageData.GetOptProperty("ДатаНачала", ""));
								docPaySlip.TopElem.finish_date = OptDate(oPackageData.GetOptProperty("ДатаОкончания", ""));
								docPaySlip.TopElem.object_type = "collaborator";
								docPaySlip.TopElem.object_id = OptInt(iPersonID, 0);
								docPaySlip.Save();
								} else {
								oRes = PushError("Ошибка при попытке открыть документ данных объектов с кодом " + XQueryLiteral(oPacket.KeyProperties.Link), oRes, sFunction, sLib);
							}
						} else {
							/* Создаём новую запись */
							newPaySlip = tools.new_doc_by_name("object_data");
							newPaySlip.BindToDb(DefaultDb);
							newPaySlip.TopElem.object_data_type_id = OptInt(oObjectDataType.id);
							newPaySlip.TopElem.code = oPacket.KeyProperties.Link;
							newPaySlip.TopElem.name = oPackageData.GetOptProperty("МесяцНачисления", "");
							newPaySlip.TopElem.data_str = EncodeJson(oPackageData.GetOptProperty("ДанныеРасчетныхЛистков"));
							newPaySlip.TopElem.start_date = OptDate(oPackageData.GetOptProperty("ДатаНачала", ""));
							newPaySlip.TopElem.finish_date = OptDate(oPackageData.GetOptProperty("ДатаОкончания", ""));
							newPaySlip.TopElem.object_type = "collaborator";
							newPaySlip.TopElem.object_id = OptInt(iPersonID, 0);
							newPaySlip.Save();
							iPaySlipID = newPaySlip.DocID;
						}
					} else {
						oRes = PushError("Невозможно получить содержание тэга ДополнительныеДанные объекта с кодом " + XQueryLiteral(sDataObjectTypeCode), oRes, sFunction, sLib);
					}					
				} else {
					oRes = PushError("Не найден тип данных объекта с кодом " + XQueryLiteral(sDataObjectTypeCode), oRes, sFunction, sLib);
				}
				/* Получаем информацию о файле */
				oFile = teBody.OptChild("Directory.AttachedFiles");
				if (oFile != undefined) {
					if(!IsEmptyValue(oFile.KeyProperties.Link)) {
						iDocID = 0;
						oFileData = ArrayOptFirstElem(XQuery("for $elem in resources where $elem/code = "+ XQueryLiteral(oFile.KeyProperties.Link) +" return $elem"));
						if (oFileData != undefined) {
							docFile = tools.open_doc(oFileData.id);
							iDocID = oFileData.id;
							if (docFile != undefined) {
								/* Удаляем файл с сервера */
								DeleteFile(UrlToOptFilePath( docFile.TopElem.file_url ));
								docFile.TopElem.file_url = "";
								docFile.TopElem.links.DeleteChildren();
								docFile.Save();
							}
						} else {
							newFile = tools.new_doc_by_name("resource");
							newFile.BindToDb(DefaultDb);
							newFile.TopElem.code = oFile.KeyProperties.Link;
							newFile.TopElem.name = oFile.KeyProperties.Owner;
							newFile.Save();
							iDocID = newFile.DocID;
						}

						/* Указываем расчётный лист в ссылках ресурса базы */
						docResource = tools.open_doc(iDocID);
						if (docResource != undefined) {
							/* Вставляем файл */
							ObtainDirectory("x-local://wt_data/attachments/");
							PutFileData(UrlToFilePath('x-local://wt_data/attachments/' + oFile.KeyProperties.Owner + oFile.Extension), oFile.FileStorage);
							docResource.TopElem.file_name = oFile.KeyProperties.Owner + oFile.Extension;
							docResource.TopElem.file_url = 'x-local://wt_data/attachments/' + oFile.KeyProperties.Owner + oFile.Extension;
							newLink = docResource.TopElem.links.AddChild();
							newLink.object_id = OptInt(iPaySlipID, 0);
							newLink.object_catalog = "object_data";
							docResource.Save();
						}

						/* Указываем файл в расчётном листе в sec_object_id */
						docPay = tools.open_doc(iPaySlipID);
						if (docPay != undefined) {
							docPay.TopElem.sec_object_type = "resource";
							docPay.TopElem.sec_object_id = OptInt(iDocID, 0);
							docPay.Save();
						}
					} else {
						oRes = PushError("Не удалось получить ключевое поле добавленного файла. Был передан некорректный Xml", oRes, sFunction, sLib)
					}
				}
			} else {
				oRes = PushError("Не удалось получить ключевое поле объекта. Был передан некорректный Xml", oRes, sFunction, sLib)
			}
		} else {
			oRes = PushError("Невозможно получить значение поля \"СообщениеОбмена\" ", oRes, sFunction, sLib);
		}
	}
	catch (e) {
		oRes = PushError(e, oRes, sFunction, sLib)
	}
	oRes.errorText = oRes.errors.join("\n")
	return oRes;
}
function CreateRequestVacationXML(VacationRequestID)
{
	var oRes = tools.get_code_library_result_object();
	oRes.error = 0;
	oRes.errors = [];
	oRes.result = undefined;
	sLib = "libAfl1C"
	sFunction = "CreateRequestVacationXML"
	try {
		docVacationRequestXML = OpenNewDoc('x-local://wtv/custom_libs/Integration_forms/VacationRequest.xmd')
		if(docVacationRequestXML!=undefined)
		{
			AlertLog(docVacationRequestXML.Xml)
		}
		else
		{
			throw 'ddddddd'
		}
	}
	catch (e) {
		oRes = PushError(e, oRes, sFunction, sLib)
	}
	oRes.errorText = oRes.errors.join("\n")
	return oRes;
}
