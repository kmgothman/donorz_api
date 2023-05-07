const express = require('express');
const bodyParser = require('body-parser');
const app = express()
const path = require('path')
const knex = require('knex')
const cors = require('cors')
const dfd = require("danfojs-node")
const bcrypt=require("bcrypt")

const db = knex({
	client: 'pg',
	connection: {
		host: '127.0.0.1',
		user: '',
		password: '',
		database: 'donorz_api'
	}
})

app.use(cors())
app.use(bodyParser.json({ type: 'application/json' }))
app.use(bodyParser.text({ type: 'text/plain' }))


// HOME PAGE
app.get('/', (req,res)=> {
    console.log('received home page request')
	res.redirect('http://localhost:3001')
})


// SIGN IN
app.post('/signin', (req,res) => {
	console.log('received sign in request')
	const { email, password } = req.body;
	if (!email || !password) {
		return res.status(400).json('incorrect form submission')
	}
	db.select('email', 'hash').from('login')
		.where('email', '=', email)
		.then(data => {
			bcrypt.compare(password, data[0].hash, function(err, result) {
			if (result) {
				console.log('valid request')
				return db.select('*').from('users')
					.where('email', '=', email)
					.then(user => {
						res.json(user[0])
					})
					.catch(err => res.status(400).json(err))
			} else {
				res.status(400).json('invalid username or password')
			}
			});
		

		})
		.catch(err => res.status(400).json(err))
})


// REGISTER
app.post('/register', (req,res) => {
	const { email, name, password } = req.body;
	bcrypt.hash(password, 10, function(err, hash) {
    	db('users')
		.returning('*')
		.insert({
			name : name,
			email: email,
	})
	.then(user => {
		res.json(user[0]);
	})
	.catch(err => res.status(400).json(err))
	db('login').insert({
		email:email,
		hash:hash
		})
	.catch(err => res.status(400).json(err))
});
})



// Receiving CSV
app.post('/file', (req,res) => {
	const data = req.body
	const email = req.headers.email
	console.log(email)
	array1 = data.split('\n')
	let designationcode = array1[1].split('","')[11]
	console.log(designationcode)
	array2 = []

	for (let x in array1) {
		let row = array1[x].split('","')
		array2.push(row)
		if (x > 0) {
			if (row.length === 3) {
				let row2 = array1[Number(x)+1].split('","')
				if (row2.length > 1) {
				db('donors').insert({
				donorcode : row[0].replace('"',''),
				name : row[1],
				city : row2[1],
				state : row2[2],
				postalcode : row2[3],
				email : row2[5],
				address : row[2]+row2[0],
				phone : row2[4],
		}).onConflict().ignore().then(console.log)
				db('donations').insert({
				donorcode : row[0].replace('"',''),
				donorname : row[1],
				code : row2[6],
				amount : row2[8],
				giftdate : row2[7],
				designationcode : row2[9],
				designationname : row2[10],
				motivationcode : row2[11],
				paymentmethodcode : row2[12],
				tenderedamount : row2[13],
				tenderedcurrency : row2[14],
				memo : row2[18]
				}).onConflict().ignore().then(console.log)}
			} else if (row.length ===22){
			db('donors').insert({
			donorcode : row[0].replace('"',''),
			name : row[1],
			city : row[3],
			state : row[4],
			postalcode : row[5],
			email : row[7],
			address : row[2],
			phone : row[6],
		}).onConflict().ignore().then(console.log)
			db('donations').insert({
			donorcode : row[0].replace('"',''),
			donorname : row[1],
			code : row[8],
			amount : row[10],
			giftdate : row[9],
			designationcode : row[11],
			designationname : row[12],
			motivationcode : row[13],
			paymentmethodcode : row[14],
			tenderedamount : row[15],
			tenderedcurrency : row[16],
			memo : row[20]
			}).onConflict().ignore().then(console.log)
			designationcode = row[11]
			}
		}
}
	db('users').where('email',email).update({designationcode : designationcode}).then(console.log)
	res.json('received form')
})


// grab donations data
app.post('/donations', (req,res) => {
	const email = req.body.email
	console.log(email)
	db('users').select('designationcode').where('email',email)
	.then((object)=> {
		db('donations').select('*').where('designationcode',object[0].designationcode)
		.then((donations) => {
			if (donations.length) {
			const donationMonths = []
			const monthNames = []
			const months = ['','January','February','March','April','May','June','July','August','September','October','November','December']
			donations.map(x=>{let date = x.giftdate.split(' ')
				mdy=date[0].split('/')
				if (mdy[0].length === 1) {
					ym = mdy[2]+'0'+mdy[0]
				} else {ym = mdy[2]+mdy[0]}
				donationMonths.push(ym)})
			var set = [...new Set(donationMonths)]
			set.sort()
			donationsArray=[]
			set.map(x=>{array = []
				donationsArray.push(array)
				monthNames.push(months[Number(x.slice(4))]+' '+x.slice(0,4))})
			donations.map(x=>{let date = x.giftdate.split(' ')
				mdy=date[0].split('/')
				if (mdy[0].length === 1) {
					ym = mdy[2]+'0'+mdy[0]
				} else {ym = mdy[2]+mdy[0]}
				donationsArray[set.indexOf(ym)].push(x)
				})
			donationSums=[]
			donationsArray.map((month)=>{
				let sum=0
				month.map(donation=>(sum=sum+Number(donation.amount)))
				donationSums.push(sum)
			})

			monthObjects = {
				monthNames: monthNames,
				donationMonths : set, 
				donations : donationsArray,
				donationSums: donationSums

			}
		// set.map(x=>{let object = {'1122':[]}
		// 			monthObjects.push(object)})
		// donations.map(x=>{let date = x.giftdate.split(' ')
		// 	mdy=date[0].split('/')
		// 	if (mdy[0].length === 1) {
		// 		ym = mdy[2]+'0'+mdy[0]
		// 	} else {ym = mdy[2]+mdy[0]}
		// 	})


		res.json(monthObjects)
	} else {res.json({
				monthNames: [],
				donationMonths : [], 
				donations : [],
				donationSum: 0

			})}
	})
	// map through donations and tally up dononation months
	// divide donation objects into their months
	// res.json with objects [{'2212':{}},{'2211':{}}]
	console.log('received donations request')
})
})

// grab donor data
app.post('/donors', (req,res) => {
	const email = req.body.email
	db('users').select('designationcode').where('email',email)
	// .then((donations) => { res.json(donations)})
	.then((object)=> {
		db('donations').select('donorcode').where('designationcode',object[0].designationcode)
		.then((codes)=> {const array1=[]
			const array2=[]
			codes.map(x=>(array1.push(x.donorcode)))
			const set = [...new Set(array1)]
			const len1 = set.length
			set.map(y=>(db('donors').select('*').where('donorcode',y)
				.then(z=>{
					array2.push(z[0])
					var len2 = array2.length
					if (len1 === len2) {
						res.json(array2)}
					})))})})
})

// grab single donor data
app.post('/donorinfo', (req,res) => {
	const {donorcode, email} = req.body;
	const donationsArray = []
	db('users').select('designationcode').where('email',email)
	.then((object)=> {
		db('donations').select('*').where({
			designationcode:object[0].designationcode,
			donorcode:donorcode
			})
		.then((data)=>{data.map(x=>(
			donationsArray.push(x)))
			donationSum=0
			donationsArray.map(donation=>(donationSum = donationSum + Number(donation.amount)))
			db('donors').select('*').where('donorcode',donorcode)
			.then((donorinfo)=>{const response = {donations:donationsArray,donorInfo:donorinfo,donationSum:donationSum}
				console.log(response)
				res.json(response)})
		})
	})

})

// grab dashboard data
app.post('/dashboard', (req,res) => {
	const email = req.body.email 
	console.log(email)
	db('users').select('designationcode').where('email',email)
	.then((object)=> {
		if (object[0].designationcode) {
		db('donations').select('*').where('designationcode',object[0].designationcode)
		.then((donations) => { const donationMonths = []
			const monthNames = []
			const months = ['','January','February','March','April','May','June','July','August','September','October','November','December']
			donations.map(x=>{let date = x.giftdate.split(' ')
				mdy=date[0].split('/')
				if (mdy[0].length === 1) {
					ym = mdy[2]+'0'+mdy[0]
				} else {ym = mdy[2]+mdy[0]}
				donationMonths.push(ym)})
			var set = [...new Set(donationMonths)]
			set.sort()
			donationsArray=[]
			set.map(x=>{array = []
				donationsArray.push(array)
				monthNames.push(months[Number(x.slice(4))]+' '+x.slice(0,4))})
			donations.map(x=>{let date = x.giftdate.split(' ')
				mdy=date[0].split('/')
				if (mdy[0].length === 1) {
					ym = mdy[2]+'0'+mdy[0]
				} else {ym = mdy[2]+mdy[0]}
				donationsArray[set.indexOf(ym)].push(x)
				})

			//calc total donations
			const monthSums=[]
			donationsArray.map((month)=>{
				var thisMonthSum=0
				month.map((donation)=>{
					thisMonthSum= thisMonthSum + Number(donation.amount)
				})
				monthSums.push(thisMonthSum)
				})
			const totalSum = monthSums.reduce((partialSum, a) => partialSum + a, 0)

			//calc average month donations
			const monthlyAverage = totalSum/monthSums.length

			dashboardObjects = {
				donationMonths:monthNames,
				totalDonors:0,
				totalDonations:totalSum,
				monthlyAverage:Math.round(monthlyAverage),
				averageDonation:0

			}

			const variable = donationsArray[0][0]
			const designationcode = variable.designationcode
			let superArray=[]

			db('donations').select('donorcode').where('designationcode',designationcode)
			.then((codes)=> {const array1=[]
				const array2=[]
				codes.map(x=>(array1.push(x.donorcode)))
				const set = [...new Set(array1)]
				const len1 = set.length
				set.map(y=>(db('donors').select('*').where('donorcode',y)
					.then(z=>{
						array2.push(z[0])
						var len2 = array2.length
						if (len1 === len2) {
							dashboardObjects.totalDonors=array2.length
							dashboardObjects.averageDonation=Math.round(dashboardObjects.monthlyAverage/array2.length)
							console.log(dashboardObjects)
							res.json(dashboardObjects)}
						})))})

	console.log('received donations request')
})
	} else {res.json({
    "donationMonths": [],
    "totalDonors": 0,
    "totalDonations": 0,
    "monthlyAverage": 0,
    "averageDonation": 0
})}
})
})


// find donors with a lapsed gift
app.post('/lapsedgift', (req,res) => {
	const email = req.body.email
	db('users').select('designationcode').where('email',email)
	.then((object)=> {
		db('donations').select('*').where({
			designationcode:object[0].designationcode
			})
		.then((donations) => { const donationMonths = []
			const monthNames = []
			const donorCodes = []
			const months = ['','January','February','March','April','May','June','July','August','September','October','November','December']
			donations.map(x=>{let date = x.giftdate.split(' ')
				donorCodes.push(x.donorcode)
				mdy=date[0].split('/')
				if (mdy[0].length === 1) {
					ym = mdy[2]+'0'+mdy[0]
				} else {ym = mdy[2]+mdy[0]}
				donationMonths.push(ym)})
			var set = [...new Set(donationMonths)]
			set.sort()
			donationsArray=[]
			set.map(x=>{array = []
				donationsArray.push(array)
				monthNames.push(months[Number(x.slice(4))]+' '+x.slice(0,4))})
			donations.map(x=>{let date = x.giftdate.split(' ')
				mdy=date[0].split('/')
				if (mdy[0].length === 1) {
					ym = mdy[2]+'0'+mdy[0]
				} else {ym = mdy[2]+mdy[0]}
				donationsArray[set.indexOf(ym)].push(x)
				})

			donorCodeSet = [...new Set(donorCodes)]
			//Check to see if theres in gaps in logged gift months
			firstMonth=set[0]
			lastMonth=set[set.length-1]
			count=firstMonth
			loggedGiftSpan=[firstMonth]
			x=0
			while (count != lastMonth) {
				yyyy=count.slice(0,4)
			 	mm=count.slice(4)
			 	if (mm === '12') {
			 		yyyy=Number(yyyy)+1
			 		mm='01'
			 	} else {
			 		mm=Number(mm)+1
			 		if (mm < 10) {
			 			mm= '0'+String(mm)
			 		}
			 	}
			 	count=String(yyyy)+String(mm)
			 	loggedGiftSpan.push(count)

			 	x=x+1
			 	if (x===100) {break}
			}
			let loggedGiftsSet = new Set(donationMonths)
			missingGifts=loggedGiftSpan.filter(x => !loggedGiftsSet.has(x))

			if (missingGifts.lenght > 0) {
				res.json({missingGifts:missingGifts})
			}

			let lapsedGifts=[]
			//check to see if each donor is missing a gift
			let counter=0
			donorCodeSet.map((x)=> {
				db('donations').select('giftdate','donorname','donorcode').where({designationcode:45717,donorcode:x})
				.then((dateArray)=> {
					counter=counter +1
					giftSpan=[]
					dateArray.map((date)=> {
						firstSplit=date.giftdate.split(' ')
						secondSplit=firstSplit[0].split('/')
						if (secondSplit[0].length >1){giftSpan.push(secondSplit[2]+secondSplit[0])}
							else {giftSpan.push(secondSplit[2]+'0'+secondSplit[0])}
					})
					giftSpan.sort()

					if (giftSpan[giftSpan.length-1] != lastMonth && giftSpan[giftSpan.length-1] != loggedGiftSpan[loggedGiftSpan.length-2]) {
						yyyymm=giftSpan[giftSpan.length-1]
						yyyy = yyyymm.slice(0,4)
						mm=Number(yyyymm.slice(4))
						object = {
							donorsLastMonth:months[mm]+' '+yyyy,
							donorname:dateArray[0].donorname,
							donorcode:dateArray[0].donorcode
						}
						lapsedGifts.push(object)
					} 
					if (counter === donorCodeSet.length){
					res.json({lapsedGifts:lapsedGifts})
					}
					}
					)

				}
				)
		}
		)


	console.log('received lapsedgift request')
})
})


// grab donor locations
app.post('/locations', (req,res) => {
	const email = req.body.email
	db('users').select('designationcode').where('email',email)
	// .then((donations) => { res.json(donations)})
	.then((object)=> {
		donorCodesArray=[]
		db('donations').select('*').where('designationcode',object[0].designationcode)
		.then((donations)=> {
			donations.map((donation)=>{
				donorCodesArray.push({donorCode:donation.donorcode, amount:donation.amount})
			})
			donorCodeSet=[... new Set(donorCodesArray)]
			stateArray=[]
			donorCodeSet.map((donorCode)=>{
				db('donors').select('*').where('donorcode',donorCode.donorCode)
				.then((donorInfo)=>{
					stateArray.push({state:donorInfo[0].state,amount:donorCode.amount})
					if (stateArray.length===donorCodeSet.length){
						states=[]
						amounts=[]
						stateArray.map((x)=>{
							if (states.includes(x.state) === false) {
								states.push(x.state)
								amounts.push(Number(x.amount))
							} else {
								let index=states.indexOf(x.state)
								amounts[index]=amounts[index]+Number(x.amount)
							}
						}
						)
						res.json({states:states,amounts:amounts})
					}

				}
				)
			}
			)
		}
		)
	}
	)
}
)

// SERVER LISTENTING
app.listen(3000, ()=> {
	console.log('app is running on port 3000')
})