//Функция обработки Физ лица полученого из 1C ZUP
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
					oRes = HandlePayslips(oPacket)
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
function HandlePayslips(oPacket)
{
	var oRes = tools.get_code_library_result_object();
	oRes.error = 0;
	oRes.errors = [];
	oRes.result = '';
	sLib = "libAfl1C"
	sFunction = "HandlePayslips"
	try {
		oObjectDataType = ArrayOptFirstElem(XQuery())
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
