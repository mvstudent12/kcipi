def get_individual_data(lastQuery = None):
    url = "https://appi-ksdoc-uat.azure-api.us/kci-pi/IndividualData"
    page_size = 500
    page = 0

    if lastQuery != None:
        params["lastQueryDateTime"] = get_formatted_string(lastQuery)
        
    while page >= 0:
        print(page)
        params = {
            "start" : page * page_size, # Increments by 500
            "quantity" : page_size
        }
        response = request.get(
            url = url,
            params = params,
            headers = {
                "Ocp-Apim-Subscription-Key" : "0612fba72df743c7a24f5b8ee117cc0a"
            }
        )

        if response.status_code == 200:
            individuals = response.json()
            for individuals in individuals:
                do_stuff_with _data(individual)
                print("individuals length " + str(len(individuals)))
                if len(individuals) < page_size:
                    page = -1 # or break
                    else:
                        page += 1 # next page

    get_individual_data()
    print("Exiting Program")

   
